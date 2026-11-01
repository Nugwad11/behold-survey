"use strict";

/*
 * BEHOLD survey server.
 * Zero npm dependencies: just Node.js 18+ (tested on Node 24).
 *
 *   node server.js            -> http://localhost:4173
 *   ADMIN_PASSWORD=... node server.js
 */

const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const SURVEY = require("./public/js/questions.js");

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
// On Render, responses are stored on the mounted persistent disk at /data.
// Locally they fall back to ./data inside the project folder.
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
const RESPONSES_FILE = path.join(DATA_DIR, "responses.jsonl");
const SECRET_FILE = path.join(DATA_DIR, ".session-secret");

const PORT = Number(process.env.PORT) || 4173;
const HOST = process.env.HOST || "0.0.0.0";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "behold-admin";
const IS_DEFAULT_PASSWORD = !process.env.ADMIN_PASSWORD;
const SESSION_HOURS = 12;
const MAX_BODY_BYTES = 150 * 1024;
const MAX_TEXT_LENGTH = 2000;
const ASSET_VERSION = Date.now().toString(36);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8"
};

/* ------------------------------------------------------------------ */
/* Setup                                                               */
/* ------------------------------------------------------------------ */

fs.mkdirSync(DATA_DIR, { recursive: true });

let sessionSecret;
try {
  sessionSecret = fs.readFileSync(SECRET_FILE, "utf8").trim();
  if (sessionSecret.length < 32) throw new Error("secret too short");
} catch (_) {
  sessionSecret = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(SECRET_FILE, sessionSecret, { mode: 0o600 });
}

const passwordHash = sha256(ADMIN_PASSWORD);

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest();
}

function safeEqual(a, b) {
  const bufA = Buffer.isBuffer(a) ? a : Buffer.from(String(a));
  const bufB = Buffer.isBuffer(b) ? b : Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

function sign(payload) {
  return crypto.createHmac("sha256", sessionSecret).update(payload).digest("base64url");
}

function createSessionToken() {
  const expires = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = String(expires);
  return payload + "." + sign(payload);
}

function verifySessionToken(token) {
  if (typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expires, signature] = parts;
  if (!/^\d+$/.test(expires)) return false;
  if (Number(expires) < Date.now()) return false;
  return safeEqual(signature, sign(expires));
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(";").forEach((part) => {
    const index = part.indexOf("=");
    if (index === -1) return;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  });
  return out;
}

function isAuthenticated(req) {
  const cookies = parseCookies(req.headers.cookie);
  return verifySessionToken(cookies.bhl_admin);
}

function sessionCookie(token) {
  const secure = process.env.COOKIE_SECURE === "1" ? "; Secure" : "";
  if (!token) {
    return `bhl_admin=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${secure}`;
  }
  return `bhl_admin=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${
    SESSION_HOURS * 60 * 60
  }${secure}`;
}

/* ------------------------------------------------------------------ */
/* Rate limiting (in-memory, per hashed IP)                            */
/* ------------------------------------------------------------------ */

const buckets = new Map();

function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.reset < now) {
    bucket = { count: 0, reset: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.reset < now) buckets.delete(k);
    }
  }
  return {
    allowed: bucket.count <= limit,
    retryAfter: Math.max(1, Math.ceil((bucket.reset - now) / 1000))
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) {
    if (v.reset < now) buckets.delete(k);
  }
}, 10 * 60 * 1000).unref();

function clientKey(req) {
  const ip = req.socket.remoteAddress || "unknown";
  return crypto
    .createHmac("sha256", sessionSecret)
    .update(ip)
    .digest("hex")
    .slice(0, 32);
}

/* ------------------------------------------------------------------ */
/* HTTP helpers                                                        */
/* ------------------------------------------------------------------ */

function securityHeaders(extra) {
  return Object.assign(
    {
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "DENY",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"
    },
    extra || {}
  );
}

function sendJson(res, status, body, extraHeaders) {
  const payload = JSON.stringify(body);
  res.writeHead(
    status,
    securityHeaders(
      Object.assign(
        {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          "Content-Length": Buffer.byteLength(payload)
        },
        extraHeaders || {}
      )
    )
  );
  res.end(payload);
}

function sendText(res, status, text, contentType) {
  res.writeHead(
    status,
    securityHeaders({
      "Content-Type": contentType || "text/plain; charset=utf-8",
      "Cache-Control": "no-store"
    })
  );
  res.end(text);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("Payload too large"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (_) {
        reject(Object.assign(new Error("Invalid JSON"), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

/* ------------------------------------------------------------------ */
/* Response storage                                                    */
/* ------------------------------------------------------------------ */

async function readResponses() {
  let raw;
  try {
    raw = await fsp.readFile(RESPONSES_FILE, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const out = [];
  raw.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      out.push(JSON.parse(trimmed));
    } catch (_) {
      /* skip corrupt line rather than losing the whole dataset */
    }
  });
  return out;
}

async function appendResponse(record) {
  await fsp.appendFile(RESPONSES_FILE, JSON.stringify(record) + "\n", "utf8");
}

async function deleteResponse(id) {
  const responses = await readResponses();
  const remaining = responses.filter((item) => item.id !== id);
  if (remaining.length === responses.length) return false;
  const temp = RESPONSES_FILE + ".tmp";
  await fsp.writeFile(temp, remaining.map((item) => JSON.stringify(item)).join("\n") + "\n", "utf8");
  await fsp.rename(temp, RESPONSES_FILE);
  return true;
}

function newId() {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `CR-${stamp}-${random}`;
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sanitizeAnswers(raw) {
  const out = {};
  if (!isPlainObject(raw)) return out;
  for (const [key, value] of Object.entries(raw)) {
    if (typeof key !== "string" || key.length > 80) continue;
    if (typeof value === "string") {
      out[key] = value.slice(0, MAX_TEXT_LENGTH);
    } else if (typeof value === "number" && Number.isFinite(value)) {
      out[key] = value;
    } else if (Array.isArray(value)) {
      out[key] = value
        .filter((item) => typeof item === "string")
        .slice(0, 40)
        .map((item) => item.slice(0, 200));
    }
  }
  return out;
}

function validateAnswers(answers) {
  const errors = [];
  const statuses = ["never", "lapsed", "current"];

  if (statuses.indexOf(answers.app_status) === -1) {
    errors.push({ id: "app_status", message: "Dating app history is required." });
    return errors;
  }

  const visible = SURVEY.visibleQuestions(answers);

  visible.forEach((question) => {
    const value = answers[question.id];

    if (question.required && !SURVEY.isAnswered(question, answers)) {
      errors.push({ id: question.id, message: "This question is required." });
      return;
    }

    if (value === undefined) return;

    if (question.type === "multi") {
      if (!Array.isArray(value)) {
        errors.push({ id: question.id, message: "Expected a list of choices." });
        return;
      }
      const valid = new Set(SURVEY.optionsFor(question).map((option) => option.value));
      value.forEach((item) => {
        if (!valid.has(item)) {
          errors.push({ id: question.id, message: "Unknown option: " + item });
        }
      });
      if (question.allowOther && value.indexOf("other") !== -1) {
        const other = answers[question.id + "_other"];
        if (typeof other !== "string" || !other.trim()) {
          errors.push({ id: question.id, message: "Please describe your other answer." });
        }
      }
      return;
    }

    if (question.type === "single") {
      const valid = new Set(SURVEY.optionsFor(question).map((option) => option.value));
      if (typeof value !== "string" || !valid.has(value)) {
        errors.push({ id: question.id, message: "Unknown option." });
        return;
      }
      if (question.allowOther && value === "other") {
        const other = answers[question.id + "_other"];
        if (typeof other !== "string" || !other.trim()) {
          errors.push({ id: question.id, message: "Please describe your other answer." });
        }
      }
      return;
    }

    if (question.type === "scale") {
      const num = Number(value);
      if (!Number.isInteger(num) || num < 1 || num > 5) {
        errors.push({ id: question.id, message: "Rating must be between 1 and 5." });
      }
      return;
    }

    if (question.type === "email") {
      if (typeof value !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())) {
        errors.push({ id: question.id, message: "Please enter a valid email address." });
      }
      return;
    }

    if (typeof value !== "string" || value.length > MAX_TEXT_LENGTH) {
      errors.push({ id: question.id, message: "Answer is too long." });
    }
  });

  return errors;
}

/* ------------------------------------------------------------------ */
/* CSV export                                                          */
/* ------------------------------------------------------------------ */

function labelFor(question, value) {
  if (value === undefined || value === null || value === "") return "";
  if (question.type === "scale") return String(Number(value));
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item === "other") {
          const other = question.id + "_other";
          return "Other: " + String(question.__answers?.[other] || "").trim();
        }
        return SURVEY.optionLabel(question, item);
      })
      .filter(Boolean)
      .join("; ");
  }
  if (value === "other") {
    return "Other: " + String(question.__answers?.[question.id + "_other"] || "").trim();
  }
  return SURVEY.optionLabel(question, value);
}

function csvEscape(value) {
  const text = String(value === undefined || value === null ? "" : value);
  return '"' + text.replace(/"/g, '""') + '"';
}

function buildCsv(responses) {
  const columns = [
    { header: "Response ID", get: (r) => r.id },
    { header: "Submitted at (UTC)", get: (r) => r.createdAt },
    { header: "Status", get: (r) => r.status },
    { header: "Duration (seconds)", get: (r) => r.durationSeconds },
    { header: "Interview opt-in", get: (r) => (r.answers.interview === "yes" ? "yes" : r.answers.interview === "maybe" ? "maybe" : "no") },
    { header: "Waitlist opt-in", get: (r) => r.answers.waitlist || "" }
  ];

  SURVEY.questions.forEach((question) => {
    columns.push({
      header: `${question.title} [${question.id}]`,
      get: (r) => {
        const scoped = Object.assign({}, question, { __answers: r.answers });
        return labelFor(scoped, r.answers[question.id]);
      }
    });
  });

  const lines = [columns.map((column) => csvEscape(column.header)).join(",")];

  responses.forEach((response) => {
    lines.push(
      columns
        .map((column) => {
          try {
            return csvEscape(column.get(response));
          } catch (_) {
            return '""';
          }
        })
        .join(",")
    );
  });

  return "\uFEFF" + lines.join("\r\n");
}

/* ------------------------------------------------------------------ */
/* Static files                                                        */
/* ------------------------------------------------------------------ */

async function serveStatic(req, res, pathname) {
  let relative;
  if (pathname === "/" || pathname === "") {
    relative = "index.html";
  } else if (pathname === "/admin" || pathname === "/admin/") {
    relative = "admin.html";
  } else {
    relative = decodeURIComponent(pathname).replace(/^\/+/, "");
  }

  const filePath = path.resolve(PUBLIC_DIR, relative);
  if (!filePath.startsWith(PUBLIC_DIR + path.sep) && filePath !== PUBLIC_DIR) {
    return sendText(res, 403, "Forbidden");
  }

  let stat;
  try {
    stat = await fsp.stat(filePath);
  } catch (_) {
    return sendText(res, 404, "Not found");
  }
  if (stat.isDirectory()) {
    return sendText(res, 404, "Not found");
  }

  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";

  if (ext === ".html") {
    let html = await fsp.readFile(filePath, "utf8");
    html = html.split("{{ASSET_VERSION}}").join(ASSET_VERSION);
    res.writeHead(
      200,
      securityHeaders({
        "Content-Type": type,
        "Cache-Control": "no-cache",
        "Content-Length": Buffer.byteLength(html)
      })
    );
    if (req.method === "HEAD") return res.end();
    return res.end(html);
  }

  res.writeHead(
    200,
    securityHeaders({
      "Content-Type": type,
      "Cache-Control": ext === ".html" || ext === ".js" || ext === ".css" ? "no-cache" : "public, max-age=3600",
      "Content-Length": stat.size
    })
  );

  if (req.method === "HEAD") return res.end();
  fs.createReadStream(filePath)
    .on("error", () => res.end())
    .pipe(res);
}

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */

async function handle(req, res) {
  const url = new URL(req.url, "http://localhost");
  const pathname = url.pathname;
  const method = req.method || "GET";

  if (pathname === "/api/health" && method === "GET") {
    return sendJson(res, 200, { ok: true, surveyVersion: SURVEY.version });
  }

  /* ----- public: submit a response ----- */
  if (pathname === "/api/responses" && method === "POST") {
    const limited = rateLimit("submit:" + clientKey(req), 20, 10 * 60 * 1000);
    if (!limited.allowed) {
      return sendJson(
        res,
        429,
        { error: "Too many submissions from this connection. Please try again shortly." },
        { "Retry-After": String(limited.retryAfter) }
      );
    }

    const body = await readBody(req);
    if (body.website) {
      /* honeypot filled by a bot: pretend success, store nothing */
      return sendJson(res, 201, { ok: true, id: newId(), discarded: true });
    }
    if (body.consent !== true) {
      return sendJson(res, 422, { error: "Consent is required." });
    }

    const answers = sanitizeAnswers(body.answers);
    const errors = validateAnswers(answers);
    if (errors.length) {
      return sendJson(res, 422, { error: "Some answers need attention.", errors });
    }

    const startedAt = typeof body.startedAt === "string" ? Date.parse(body.startedAt) : NaN;
    const now = Date.now();
    let durationSeconds = null;
    if (Number.isFinite(startedAt)) {
      const delta = Math.round((now - startedAt) / 1000);
      if (delta >= 0 && delta < 60 * 60 * 24 * 14) durationSeconds = delta;
    }

    const record = {
      id: newId(),
      createdAt: new Date(now).toISOString(),
      startedAt: Number.isFinite(startedAt) ? new Date(startedAt).toISOString() : null,
      durationSeconds,
      consent: true,
      surveyVersion: SURVEY.version,
      status: answers.app_status,
      answers,
      meta: {
        referrer: typeof body.referrer === "string" ? body.referrer.slice(0, 500) : "",
        userAgent: String(req.headers["user-agent"] || "").slice(0, 300),
        ipHash: clientKey(req).slice(0, 12)
      }
    };

    await appendResponse(record);
    console.log(
      `[response] ${record.id} status=${record.status} duration=${
        durationSeconds === null ? "?" : durationSeconds + "s"
      } total=${(await readResponses()).length}`
    );
    return sendJson(res, 201, { ok: true, id: record.id });
  }

  /* ----- admin auth ----- */
  if (pathname === "/api/admin/login" && method === "POST") {
    const limited = rateLimit("login:" + clientKey(req), 8, 10 * 60 * 1000);
    if (!limited.allowed) {
      return sendJson(
        res,
        429,
        { error: "Too many login attempts. Try again in a few minutes." },
        { "Retry-After": String(limited.retryAfter) }
      );
    }
    const body = await readBody(req);
    if (!body || typeof body.password !== "string") {
      return sendJson(res, 400, { error: "Password required." });
    }
    if (!safeEqual(sha256(body.password), passwordHash)) {
      return sendJson(res, 401, { error: "Incorrect password." });
    }
    return sendJson(
      res,
      200,
      { ok: true },
      { "Set-Cookie": sessionCookie(createSessionToken()) }
    );
  }

  if (pathname === "/api/admin/logout" && method === "POST") {
    return sendJson(res, 200, { ok: true }, { "Set-Cookie": sessionCookie(null) });
  }

  if (pathname === "/api/admin/session" && method === "GET") {
    return sendJson(res, 200, { authenticated: isAuthenticated(req) });
  }

  /* ----- admin data ----- */
  if (pathname.startsWith("/api/admin/")) {
    if (!isAuthenticated(req)) {
      return sendJson(res, 401, { error: "Not authenticated." });
    }

    if (pathname === "/api/admin/responses" && method === "GET") {
      const responses = await readResponses();
      responses.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      return sendJson(res, 200, {
        responses,
        count: responses.length,
        generatedAt: new Date().toISOString(),
        surveyVersion: SURVEY.version
      });
    }

    if (pathname === "/api/admin/export.csv" && method === "GET") {
      const responses = await readResponses();
      responses.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
      const csv = buildCsv(responses);
      const name = `behold-survey-${new Date().toISOString().slice(0, 10)}.csv`;
      res.writeHead(
        200,
        securityHeaders({
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${name}"`,
          "Cache-Control": "no-store",
          "Content-Length": Buffer.byteLength(csv)
        })
      );
      return res.end(csv);
    }

    if (pathname === "/api/admin/export.json" && method === "GET") {
      const responses = await readResponses();
      const payload = JSON.stringify(
        { exportedAt: new Date().toISOString(), surveyVersion: SURVEY.version, responses },
        null,
        2
      );
      const name = `behold-survey-${new Date().toISOString().slice(0, 10)}.json`;
      res.writeHead(
        200,
        securityHeaders({
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${name}"`,
          "Cache-Control": "no-store",
          "Content-Length": Buffer.byteLength(payload)
        })
      );
      return res.end(payload);
    }

    const deleteMatch = pathname.match(/^\/api\/admin\/responses\/([A-Za-z0-9-]+)$/);
    if (deleteMatch && method === "DELETE") {
      const removed = await deleteResponse(deleteMatch[1]);
      if (!removed) return sendJson(res, 404, { error: "Response not found." });
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 404, { error: "Unknown admin endpoint." });
  }

  if (pathname.startsWith("/api/")) {
    return sendJson(res, 404, { error: "Unknown endpoint." });
  }

  if (method !== "GET" && method !== "HEAD") {
    return sendText(res, 405, "Method not allowed");
  }

  return serveStatic(req, res, pathname);
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((error) => {
    const status = error.status || 500;
    if (status === 413) {
      res.setHeader("Connection", "close");
    }
    if (status >= 500) console.error("[error]", error);
    if (!res.headersSent) {
      sendJson(res, status, { error: status >= 500 ? "Something went wrong." : error.message });
    } else {
      res.end();
    }
  });
});

server.listen(PORT, HOST, () => {
  const shownHost = HOST === "0.0.0.0" ? "localhost" : HOST;
  console.log("");
  console.log("  BEHOLD — Christian Dating Survey");
  console.log("  ---------------------------------");
  console.log(`  Survey   http://${shownHost}:${PORT}/`);
  console.log(`  Admin    http://${shownHost}:${PORT}/admin`);
  console.log(`  Data     ${RESPONSES_FILE}`);
  if (IS_DEFAULT_PASSWORD) {
    console.log("");
    console.log("  ! Admin password is the default: behold-admin");
    console.log("    Set a real one before sharing this link:");
    console.log("    ADMIN_PASSWORD=your-password node server.js");
  }
  console.log("");
});
