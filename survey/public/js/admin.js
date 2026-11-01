/*
 * Covenant — research dashboard client.
 */
(function () {
  "use strict";

  var SURVEY = window.SURVEY;
  var BRAND = window.BRAND;

  var root = document.getElementById("admin-root");
  var toastEl = document.getElementById("toast");

  var state = {
    responses: [],
    loadedAt: null,
    filter: "all",
    query: "",
    sort: "newest",
    showAllFeedback: false,
    openId: null
  };

  var STATUS_LABELS = {
    never: "Never used",
    lapsed: "Lapsed",
    current: "Current user"
  };

  var FEEDBACK_QUESTIONS = [
    { id: "frustration", tag: "Biggest frustration" },
    { id: "redesign", tag: "First thing to change" },
    { id: "ideal", tag: "Ideal experience" },
    { id: "anything_else", tag: "Anything else" }
  ];

  /* ------------------------------------------------------------------ */
  /* Utilities                                                           */
  /* ------------------------------------------------------------------ */

  function escapeHtml(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () {
      toastEl.classList.remove("is-visible");
    }, 2600);
  }

  function findQuestion(id) {
    for (var i = 0; i < SURVEY.questions.length; i += 1) {
      if (SURVEY.questions[i].id === id) return SURVEY.questions[i];
    }
    return null;
  }

  function pct(part, total) {
    if (!total) return 0;
    return Math.round((part / total) * 100);
  }

  function formatDateTime(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
      });
    } catch (_) {
      return iso;
    }
  }

  function formatDateShort(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short"
      });
    } catch (_) {
      return iso;
    }
  }

  function formatDuration(seconds) {
    if (seconds === null || seconds === undefined || !Number.isFinite(Number(seconds))) {
      return "—";
    }
    var total = Math.round(Number(seconds));
    var minutes = Math.floor(total / 60);
    var secs = total % 60;
    if (minutes >= 60) {
      var hours = Math.floor(minutes / 60);
      return hours + "h " + (minutes % 60) + "m";
    }
    return minutes + "m " + String(secs).padStart(2, "0") + "s";
  }

  function api(path, options) {
    var config = Object.assign(
      {
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin"
      },
      options || {}
    );
    return fetch(path, config).then(function (response) {
      return response
        .json()
        .catch(function () {
          return {};
        })
        .then(function (data) {
          if (!response.ok) {
            var error = new Error(data.error || "Request failed (" + response.status + ")");
            error.status = response.status;
            throw error;
          }
          return data;
        });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Login                                                               */
  /* ------------------------------------------------------------------ */

  function renderLogin(message) {
    state.openId = null;
    closeDrawer(true);
    document.body.style.overflow = "";

    root.innerHTML =
      '<div class="admin-login">' +
      '<div class="login-card panel">' +
      '<div class="login-brand">' +
      '<span class="brand-mark" aria-hidden="true">' +
      escapeHtml(BRAND.monogram) +
      "</span>" +
      "<span><span class=\"login-brand-name\">" +
      escapeHtml(BRAND.name) +
      '</span><span class="login-brand-sub">Research dashboard</span></span>' +
      "</div>" +
      "<h1>Welcome back</h1>" +
      '<p class="login-copy">Sign in to review survey responses and export the dataset.</p>' +
      '<form class="login-form" id="login-form" novalidate>' +
      '<label for="admin-password">Admin password</label>' +
      '<input class="input" type="password" id="admin-password" name="password" autocomplete="current-password" required />' +
      '<p class="login-error" id="login-error" role="alert"' +
      (message ? "" : " hidden") +
      ">" +
      escapeHtml(message || "") +
      "</p>" +
      '<button type="submit" class="btn btn-primary" id="login-btn">Sign in</button>' +
      "</form>" +
      '<p class="login-note">This dashboard contains anonymous research data, including optional contact details. Ask the project owner for the password and do not share it.</p>' +
      "</div>" +
      "</div>";

    var password = document.getElementById("admin-password");
    if (password) password.focus();
  }

  function handleLogin(event) {
    event.preventDefault();
    var input = document.getElementById("admin-password");
    var errorEl = document.getElementById("login-error");
    var button = document.getElementById("login-btn");
    if (!input || !input.value) {
      if (errorEl) {
        errorEl.textContent = "Please enter the password.";
        errorEl.hidden = false;
      }
      return;
    }
    if (button) {
      button.disabled = true;
      button.textContent = "Signing in…";
    }
    api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password: input.value })
    })
      .then(function () {
        boot();
      })
      .catch(function (error) {
        if (error.status === 429) {
          renderLogin("Too many attempts. Please wait a few minutes and try again.");
          return;
        }
        if (errorEl) {
          errorEl.textContent = "That password did not work. Please try again.";
          errorEl.hidden = false;
        }
        if (button) {
          button.disabled = false;
          button.textContent = "Sign in";
        }
        input.select();
      });
  }

  /* ------------------------------------------------------------------ */
  /* Aggregation                                                         */
  /* ------------------------------------------------------------------ */

  function poolFor(pool) {
    if (pool === "barriers") {
      return state.responses.filter(function (r) {
        return r.status === "never" || r.status === "lapsed";
      });
    }
    if (pool === "history") {
      return state.responses.filter(function (r) {
        return r.status === "lapsed" || r.status === "current";
      });
    }
    return state.responses;
  }

  function tallyMulti(questionId, pool) {
    var rows = poolFor(pool);
    var question = findQuestion(questionId);
    var counts = {};
    var denominator = 0;

    rows.forEach(function (response) {
      var value = response.answers ? response.answers[questionId] : null;
      if (!Array.isArray(value) || !value.length) return;
      denominator += 1;
      value.forEach(function (item) {
        counts[item] = (counts[item] || 0) + 1;
      });
    });

    var items = Object.keys(counts)
      .map(function (value) {
        return {
          value: value,
          label: question ? SURVEY.optionLabel(question, value) : value,
          count: counts[value]
        };
      })
      .sort(function (a, b) {
        return b.count - a.count;
      });

    return { items: items, denominator: denominator };
  }

  function tallySingle(questionId, pool) {
    var rows = poolFor(pool);
    var question = findQuestion(questionId);
    var counts = {};
    var denominator = 0;

    rows.forEach(function (response) {
      var value = response.answers ? response.answers[questionId] : null;
      if (value === undefined || value === null || value === "") return;
      denominator += 1;
      counts[value] = (counts[value] || 0) + 1;
    });

    var items = Object.keys(counts).map(function (value) {
      return {
        value: value,
        label: question ? SURVEY.optionLabel(question, value) : value,
        count: counts[value]
      };
    });

    if (question && question.options) {
      var order = SURVEY.optionsFor(question);
      items.sort(function (a, b) {
        return order.findIndex(function (o) {
          return o.value === a.value;
        }) - order.findIndex(function (o) {
          return o.value === b.value;
        });
      });
    }

    return { items: items, denominator: denominator };
  }

  function averageScale(questionId, pool) {
    var rows = poolFor(pool);
    var total = 0;
    var count = 0;
    rows.forEach(function (response) {
      var value = Number(response.answers ? response.answers[questionId] : NaN);
      if (Number.isFinite(value)) {
        total += value;
        count += 1;
      }
    });
    return count ? total / count : null;
  }

  function answerText(response, question) {
    var value = response.answers ? response.answers[question.id] : undefined;
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && !value.length)) {
      return "";
    }
    if (question.type === "scale") return value + " / 5";
    if (Array.isArray(value)) {
      return value
        .map(function (item) {
          if (item === "other") {
            var other = response.answers[question.id + "_other"];
            return other ? "Other: " + other : "Other";
          }
          return SURVEY.optionLabel(question, item);
        })
        .join("; ");
    }
    if (value === "other") {
      var text = response.answers[question.id + "_other"];
      return text ? "Other: " + text : "Other";
    }
    return SURVEY.optionLabel(question, value);
  }

  /* ------------------------------------------------------------------ */
  /* Dashboard                                                           */
  /* ------------------------------------------------------------------ */

  function barRows(items, denominator, limit, gold) {
    if (!items.length) {
      return '<p class="empty-note">No answers yet.</p>';
    }
    var max = items[0].count || 1;
    return (
      '<div class="bars">' +
      items
        .slice(0, limit || 8)
        .map(function (item) {
          var share = pct(item.count, denominator);
          var width = Math.max(3, Math.round((item.count / max) * 100));
          return (
            '<div class="bar-row" title="' +
            escapeHtml(item.label + ": " + item.count + " of " + denominator + " (" + share + "%)") +
            '">' +
            '<div class="bar-label"><span class="bar-label-text">' +
            escapeHtml(item.label) +
            '</span><div class="bar-track"><div class="bar-fill' +
            (gold ? " gold" : "") +
            '" style="width:' +
            width +
            '%"></div></div></div>' +
            '<div class="bar-value"><strong>' +
            item.count +
            "</strong> · " +
            share +
            "%</div>" +
            "</div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function feedbackEntries() {
    var entries = [];
    state.responses.forEach(function (response) {
      var visible = SURVEY.visibleQuestions(response.answers || {});
      var visibleIds = visible.map(function (question) {
        return question.id;
      });
      FEEDBACK_QUESTIONS.forEach(function (meta) {
        if (visibleIds.indexOf(meta.id) === -1) return;
        var question = findQuestion(meta.id);
        var text = answerText(response, question);
        if (!text.trim()) return;
        entries.push({ response: response, tag: meta.tag, text: text });
      });
    });
    entries.sort(function (a, b) {
      return String(b.response.createdAt).localeCompare(String(a.response.createdAt));
    });
    return entries;
  }

  function renderDashboard() {
    var responses = state.responses;
    var total = responses.length;

    var gatePool = responses.filter(function (r) {
      return (
        (r.status === "never" || r.status === "lapsed") &&
        Number.isFinite(Number(r.answers && r.answers.try_likelihood))
      );
    });
    var gatePass = gatePool.filter(function (r) {
      return Number(r.answers.try_likelihood) >= 4;
    });
    var gatePct = gatePool.length ? Math.round((gatePass.length / gatePool.length) * 1000) / 10 : null;

    var tryAverage = averageScale("try_likelihood");
    var interviews = responses.filter(function (r) {
      return r.answers && (r.answers.interview === "yes" || r.answers.interview === "maybe");
    }).length;
    var interviewYes = responses.filter(function (r) {
      return r.answers && r.answers.interview === "yes";
    }).length;
    var waitlist = responses.filter(function (r) {
      return r.answers && r.answers.waitlist === "yes";
    }).length;

    var durations = responses
      .map(function (r) {
        return Number(r.durationSeconds);
      })
      .filter(function (value) {
        return Number.isFinite(value) && value >= 0;
      })
      .sort(function (a, b) {
        return a - b;
      });
    var medianDuration = durations.length ? durations[Math.floor(durations.length / 2)] : null;

    var neverCount = responses.filter(function (r) {
      return r.status === "never";
    }).length;
    var lapsedCount = responses.filter(function (r) {
      return r.status === "lapsed";
    }).length;
    var currentCount = responses.filter(function (r) {
      return r.status === "current";
    }).length;

    var barriers = tallyMulti("barriers", "barriers");
    var dealbreakers = tallySingle("barrier_top", "barriers");
    var motivators = tallyMulti("motivators", "all");
    var topMotivators = tallySingle("motivator_top", "all");
    var discovery = tallySingle("discovery", "all");
    var pricing = tallySingle("price_ceiling", "all");
    var trust = tallyMulti("trust_triggers", "all");

    var importanceQuestions = SURVEY.questions.filter(function (q) {
      return q.group === "importance";
    });
    var importanceRows = importanceQuestions
      .map(function (question) {
        var average = averageScale(question.id);
        return { label: question.title, average: average };
      })
      .filter(function (row) {
        return row.average !== null;
      })
      .sort(function (a, b) {
        return b.average - a.average;
      });

    var weeklyChurch = responses.filter(function (r) {
      var value = r.answers && r.answers.church_attendance;
      return value === "weekly" || value === "monthly";
    }).length;
    var faithCentral = responses.filter(function (r) {
      return Number(r.answers && r.answers.faith_centrality) >= 4;
    }).length;
    var denomEssential = responses.filter(function (r) {
      return r.answers && r.answers.denomination_importance === "essential";
    }).length;

    var gateBadge =
      gatePct === null
        ? '<span class="badge badge-quiet">No data</span>'
        : gatePct >= 40
        ? '<span class="badge badge-pass">Gate passed</span>'
        : '<span class="badge badge-fail">Below 40%</span>';

    var feedback = feedbackEntries();
    var feedbackLimit = state.showAllFeedback ? feedback.length : 6;

    root.innerHTML =
      '<header class="admin-topbar">' +
      '<div class="admin-topbar-inner">' +
      '<div class="admin-brand">' +
      '<span class="brand-mark" aria-hidden="true">' +
      escapeHtml(BRAND.monogram) +
      "</span>" +
      "<div><span class=\"admin-title\">" +
      escapeHtml(BRAND.adminTitle) +
      '</span><span class="admin-sub">' +
      escapeHtml(BRAND.name) +
      " · " +
      escapeHtml(BRAND.surveyTitle) +
      "</span></div>" +
      "</div>" +
      '<div class="admin-actions">' +
      '<span class="updated">Updated ' +
      escapeHtml(state.loadedAt ? formatDateTime(state.loadedAt) : "just now") +
      "</span>" +
      '<button type="button" class="btn btn-ghost" data-admin-action="refresh">Refresh</button>' +
      '<a class="btn btn-ghost" href="/" target="_blank" rel="noopener">Open survey</a>' +
      '<a class="btn btn-ghost" href="/api/admin/export.csv">Export CSV</a>' +
      '<button type="button" class="btn btn-primary" data-admin-action="logout">Sign out</button>' +
      "</div>" +
      "</div>" +
      "</header>" +
      '<main class="admin-main">' +
      '<section class="kpi-grid" aria-label="Key metrics">' +
      '<div class="kpi"><div class="kpi-label">Responses</div><div class="kpi-value">' +
      total +
      '</div><div class="kpi-sub">Completed submissions</div></div>' +
      '<div class="kpi gate"><div class="kpi-label">Decision gate</div><div class="kpi-value">' +
      (gatePct === null ? "—" : gatePct + "<small>%</small>") +
      '</div><div class="kpi-sub">' +
      gateBadge +
      " " +
      gatePass.length +
      " of " +
      gatePool.length +
      " rate 4–5</div></div>" +
      '<div class="kpi"><div class="kpi-label">Would try it</div><div class="kpi-value">' +
      (tryAverage === null ? "—" : tryAverage.toFixed(2) + "<small>/ 5</small>") +
      '</div><div class="kpi-sub">Average intent to try</div></div>' +
      '<div class="kpi"><div class="kpi-label">Interview opt-ins</div><div class="kpi-value">' +
      interviews +
      '</div><div class="kpi-sub">' +
      interviewYes +
      " confirmed · " +
      (interviews - interviewYes) +
      " maybe</div></div>" +
      '<div class="kpi"><div class="kpi-label">Waitlist</div><div class="kpi-value">' +
      waitlist +
      '</div><div class="kpi-sub">Early-access requests</div></div>' +
      '<div class="kpi"><div class="kpi-label">Median time</div><div class="kpi-value" style="font-size:1.55rem">' +
      formatDuration(medianDuration) +
      '</div><div class="kpi-sub">From start to submit</div></div>' +
      "</section>" +

      '<section class="admin-grid">' +
      '<div class="panel-card">' +
      '<div class="panel-head"><h2 class="panel-title">Sample composition</h2><span class="panel-note">n = ' +
      total +
      "</span></div>" +
      '<div class="segment-bar" aria-hidden="true">' +
      '<span class="segment-never" style="width:' +
      pct(neverCount, total) +
      '%"></span>' +
      '<span class="segment-lapsed" style="width:' +
      pct(lapsedCount, total) +
      '%"></span>' +
      '<span class="segment-current" style="width:' +
      pct(currentCount, total) +
      '%"></span>' +
      "</div>" +
      '<div class="segment-legend">' +
      '<div class="segment-item"><span class="dot segment-never"></span>Never used<strong>' +
      neverCount +
      "</strong></div>" +
      '<div class="segment-item"><span class="dot segment-lapsed"></span>Lapsed<strong>' +
      lapsedCount +
      "</strong></div>" +
      '<div class="segment-item"><span class="dot segment-current"></span>Current<strong>' +
      currentCount +
      "</strong></div>" +
      "</div>" +
      '<div class="segment-legend" style="margin-top:16px">' +
      '<div class="segment-item">Church monthly+<strong>' +
      pct(weeklyChurch, total) +
      "%</strong></div>" +
      '<div class="segment-item">Faith central (4–5)<strong>' +
      pct(faithCentral, total) +
      "%</strong></div>" +
      '<div class="segment-item">Denomination essential<strong>' +
      pct(denomEssential, total) +
      "%</strong></div>" +
      "</div>" +
      "</div>" +

      '<div class="panel-card">' +
      '<div class="panel-head"><h2 class="panel-title">Top barriers</h2><span class="panel-note">never + lapsed · n = ' +
      barriers.denominator +
      "</span></div>" +
      barRows(barriers.items, barriers.denominator, 8) +
      "</div>" +

      '<div class="panel-card">' +
      '<div class="panel-head"><h2 class="panel-title">Biggest deal-breaker</h2><span class="panel-note">single choice · n = ' +
      dealbreakers.denominator +
      "</span></div>" +
      barRows(dealbreakers.items, dealbreakers.denominator, 6, true) +
      "</div>" +

      '<div class="panel-card">' +
      '<div class="panel-head"><h2 class="panel-title">Top motivators</h2><span class="panel-note">all respondents · n = ' +
      motivators.denominator +
      "</span></div>" +
      barRows(motivators.items, motivators.denominator, 8) +
      "</div>" +

      '<div class="panel-card">' +
      '<div class="panel-head"><h2 class="panel-title">Most important feature</h2><span class="panel-note">single choice · n = ' +
      topMotivators.denominator +
      "</span></div>" +
      barRows(topMotivators.items, topMotivators.denominator, 6, true) +
      "</div>" +

      '<div class="panel-card">' +
      '<div class="panel-head"><h2 class="panel-title">Importance ratings</h2><span class="panel-note">average / 5</span></div>' +
      (importanceRows.length
        ? importanceRows
            .map(function (row) {
              return (
                '<div class="importance-row"><span class="importance-label">' +
                escapeHtml(row.label) +
                '</span><span class="importance-score">' +
                row.average.toFixed(2) +
                " <small>/5</small></span></div>"
              );
            })
            .join("")
        : '<p class="empty-note">No ratings yet.</p>') +
      "</div>" +

      '<div class="panel-card">' +
      '<div class="panel-head"><h2 class="panel-title">Willingness to pay</h2><span class="panel-note">n = ' +
      pricing.denominator +
      "</span></div>" +
      barRows(pricing.items, pricing.denominator, 6) +
      "</div>" +

      '<div class="panel-card">' +
      '<div class="panel-head"><h2 class="panel-title">Discovery preference</h2><span class="panel-note">n = ' +
      discovery.denominator +
      "</span></div>" +
      barRows(discovery.items, discovery.denominator, 5, true) +
      "</div>" +

      '<div class="panel-card">' +
      '<div class="panel-head"><h2 class="panel-title">Trust triggers</h2><span class="panel-note">n = ' +
      trust.denominator +
      "</span></div>" +
      barRows(trust.items, trust.denominator, 7) +
      "</div>" +

      '<div class="panel-card panel-span-2">' +
      '<div class="panel-head"><h2 class="panel-title">In their own words</h2><span class="panel-note">' +
      feedback.length +
      " open answers</span></div>" +
      (feedback.length
        ? '<div class="feedback-list">' +
          feedback
            .slice(0, feedbackLimit)
            .map(function (entry) {
              var r = entry.response;
              var age = r.answers && r.answers.age ? r.answers.age : "age unknown";
              return (
                '<article class="quote-card"><span class="quote-tag">' +
                escapeHtml(entry.tag) +
                "</span><blockquote>" +
                escapeHtml(entry.text) +
                '</blockquote><div class="quote-meta"><span>' +
                escapeHtml(STATUS_LABELS[r.status] || r.status || "unknown") +
                "</span><span>" +
                escapeHtml(age) +
                "</span><span>" +
                escapeHtml(formatDateShort(r.createdAt)) +
                "</span></div></article>"
              );
            })
            .join("") +
          "</div>" +
          (feedback.length > 6
            ? '<div class="feedback-actions"><button type="button" class="link-btn" data-admin-action="toggle-feedback">' +
              (state.showAllFeedback ? "Show fewer" : "Show all " + feedback.length) +
              "</button></div>"
            : "")
        : '<p class="empty-note">No open-text answers yet.</p>') +
      "</div>" +
      "</section>" +

      '<section class="panel-card table-panel" aria-labelledby="responses-title">' +
      '<div class="panel-head"><h2 class="panel-title" id="responses-title">Individual responses</h2><span class="panel-note">Click a row to read the full response</span></div>' +
      '<div class="table-tools">' +
      '<div class="search-wrap">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>' +
      '<input class="search-input" type="search" id="table-search" placeholder="Search ID, email, or any answer…" aria-label="Search responses" value="' +
      escapeHtml(state.query) +
      '" />' +
      "</div>" +
      '<select class="select" id="status-filter" aria-label="Filter by user status">' +
      '<option value="all"' +
      (state.filter === "all" ? " selected" : "") +
      ">All respondents</option>" +
      '<option value="never"' +
      (state.filter === "never" ? " selected" : "") +
      ">Never used</option>" +
      '<option value="lapsed"' +
      (state.filter === "lapsed" ? " selected" : "") +
      ">Lapsed</option>" +
      '<option value="current"' +
      (state.filter === "current" ? " selected" : "") +
      ">Current users</option>" +
      "</select>" +
      '<select class="select" id="sort-order" aria-label="Sort responses">' +
      '<option value="newest"' +
      (state.sort === "newest" ? " selected" : "") +
      ">Newest first</option>" +
      '<option value="oldest"' +
      (state.sort === "oldest" ? " selected" : "") +
      ">Oldest first</option>" +
      "</select>" +
      '<button type="button" class="btn btn-ghost btn-small" data-admin-action="export">Export CSV</button>' +
      '<button type="button" class="btn btn-ghost btn-small" data-admin-action="export-json">Export JSON</button>' +
      '<span class="row-count" id="row-count"></span>' +
      "</div>" +
      '<div class="table-scroll"><table class="responses-table">' +
      "<thead><tr><th>Submitted</th><th>ID</th><th>Status</th><th>Age</th><th>Tradition</th><th>Try</th><th>Interview</th></tr></thead>" +
      '<tbody id="responses-body"></tbody>' +
      "</table></div>" +
      "</section>" +
      "</main>";

    renderTable();
  }

  /* ------------------------------------------------------------------ */
  /* Table                                                               */
  /* ------------------------------------------------------------------ */

  function filteredResponses() {
    var query = state.query.trim().toLowerCase();
    var rows = state.responses.filter(function (response) {
      if (state.filter !== "all" && response.status !== state.filter) return false;
      if (!query) return true;
      var haystack = [
        response.id,
        response.status,
        response.answers && response.answers.email,
        response.answers && response.answers.first_name
      ]
        .concat(
          Object.keys(response.answers || {}).map(function (key) {
            return response.answers[key];
          })
        )
        .join(" ")
        .toLowerCase();
      return haystack.indexOf(query) !== -1;
    });

    rows.sort(function (a, b) {
      var diff = String(a.createdAt).localeCompare(String(b.createdAt));
      return state.sort === "oldest" ? diff : -diff;
    });

    return rows;
  }

  function renderTable() {
    var body = document.getElementById("responses-body");
    var countEl = document.getElementById("row-count");
    if (!body) return;

    var rows = filteredResponses();

    if (countEl) {
      countEl.textContent = rows.length + " of " + state.responses.length + " shown";
    }

    if (!rows.length) {
      body.innerHTML =
        '<tr><td colspan="7"><div class="table-empty"><strong>' +
        (state.responses.length ? "No responses match these filters" : "No responses yet") +
        "</strong>" +
        (state.responses.length
          ? "Try clearing the search or status filter."
          : 'Share the survey link to start collecting answers. Open <a href="/" target="_blank" rel="noopener">the survey</a> to test a submission.') +
        "</div></td></tr>";
      return;
    }

    body.innerHTML = rows
      .map(function (response) {
        var answers = response.answers || {};
        var ageQuestion = findQuestion("age");
        var denomQuestion = findQuestion("denomination");
        var tryValue = Number(answers.try_likelihood);
        var interview = answers.interview || "—";
        return (
          '<tr data-row-id="' +
          escapeHtml(response.id) +
          '" tabindex="0" aria-label="Open response ' +
          escapeHtml(response.id) +
          '">' +
          '<td class="mono">' +
          escapeHtml(formatDateShort(response.createdAt)) +
          "</td>" +
          '<td class="mono">' +
          escapeHtml(response.id) +
          "</td>" +
          '<td><span class="badge ' +
          (response.status === "current"
            ? "badge-gold"
            : response.status === "lapsed"
            ? "badge-quiet"
            : "badge-plum") +
          '">' +
          escapeHtml(STATUS_LABELS[response.status] || response.status || "—") +
          "</span></td>" +
          "<td>" +
          escapeHtml(answers.age || "—") +
          "</td>" +
          "<td>" +
          escapeHtml(
            answers.denomination ? SURVEY.optionLabel(denomQuestion, answers.denomination) : "—"
          ) +
          "</td>" +
          "<td>" +
          (Number.isFinite(tryValue) ? tryValue + " / 5" : "—") +
          "</td>" +
          "<td>" +
          escapeHtml(interview) +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  /* ------------------------------------------------------------------ */
  /* Drawer                                                              */
  /* ------------------------------------------------------------------ */

  function closeDrawer(immediate) {
    var drawer = document.querySelector(".drawer");
    var backdrop = document.querySelector(".drawer-backdrop");
    if (!drawer && !backdrop) return;
    state.openId = null;
    document.body.style.overflow = "";
    if (immediate) {
      if (drawer) drawer.remove();
      if (backdrop) backdrop.remove();
      return;
    }
    [drawer, backdrop].forEach(function (el) {
      if (el) el.remove();
    });
  }

  function openDrawer(id) {
    var response = state.responses.find(function (item) {
      return item.id === id;
    });
    if (!response) return;
    state.openId = id;

    var answers = response.answers || {};
    var visible = SURVEY.visibleQuestions(answers);
    var sectionsHtml = SURVEY.sections
      .map(function (section) {
        var questions = visible.filter(function (question) {
          return question.section === section.id;
        });
        if (!questions.length) return "";
        var rows = questions
          .map(function (question) {
            var text = answerText(response, question) || "—";
            return (
              '<div class="answer-row"><dt>' +
              escapeHtml(question.title) +
              "</dt><dd>" +
              escapeHtml(text) +
              "</dd></div>"
            );
          })
          .join("");
        return (
          '<div class="drawer-section"><h3>' +
          escapeHtml(section.title) +
          "</h3><dl style=\"margin:0\">" +
          rows +
          "</dl></div>"
        );
      })
      .join("");

    var meta = response.meta || {};
    var backdrop = document.createElement("div");
    backdrop.className = "drawer-backdrop";
    backdrop.setAttribute("data-close-drawer", "true");

    var drawer = document.createElement("aside");
    drawer.className = "drawer";
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-modal", "true");
    drawer.setAttribute("aria-labelledby", "drawer-title");
    drawer.innerHTML =
      '<div class="drawer-head">' +
      '<div><div class="drawer-id" id="drawer-title">' +
      escapeHtml(response.id) +
      '</div><div class="drawer-meta">' +
      escapeHtml(formatDateTime(response.createdAt)) +
      " · " +
      escapeHtml(STATUS_LABELS[response.status] || response.status || "unknown") +
      " · " +
      escapeHtml(formatDuration(response.durationSeconds)) +
      "</div></div>" +
      '<button type="button" class="drawer-close" data-close-drawer aria-label="Close response">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>' +
      "</button>" +
      "</div>" +
      '<div class="drawer-body">' +
      sectionsHtml +
      '<div class="drawer-section"><h3>Technical details</h3><dl style="margin:0">' +
      '<div class="answer-row"><dt>Survey version</dt><dd>' +
      escapeHtml(response.surveyVersion || SURVEY.version) +
      "</dd></div>" +
      '<div class="answer-row"><dt>Consent</dt><dd>' +
      (response.consent ? "Given" : "Not recorded") +
      "</dd></div>" +
      '<div class="answer-row"><dt>Referrer</dt><dd>' +
      escapeHtml(meta.referrer || "Direct") +
      "</dd></div>" +
      '<div class="answer-row"><dt>Network fingerprint</dt><dd>' +
      escapeHtml(meta.ipHash || "—") +
      "</dd></div>" +
      "</dl></div>" +
      "</div>" +
      '<div class="drawer-foot"><span>Contains optional contact details — handle with care.</span>' +
      '<button type="button" class="btn btn-danger btn-small" data-admin-action="delete" data-id="' +
      escapeHtml(response.id) +
      '">Delete response</button></div>';

    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);
    document.body.style.overflow = "hidden";

    var closeBtn = drawer.querySelector(".drawer-close");
    if (closeBtn) closeBtn.focus();
  }

  /* ------------------------------------------------------------------ */
  /* Actions                                                             */
  /* ------------------------------------------------------------------ */

  function exportCsv() {
    window.location.href = "/api/admin/export.csv";
    toast("Preparing CSV export…");
  }

  function exportJson() {
    window.location.href = "/api/admin/export.json";
    toast("Preparing JSON export…");
  }

  function deleteCurrent(id) {
    if (!id) return;
    var confirmed = window.confirm(
      "Delete response " + id + "?\n\nThis permanently removes it from the dataset and cannot be undone."
    );
    if (!confirmed) return;

    api("/api/admin/responses/" + encodeURIComponent(id), { method: "DELETE" })
      .then(function () {
        closeDrawer();
        toast("Response deleted.");
        return loadResponses(true);
      })
      .catch(function (error) {
        toast(error.message || "Could not delete response.");
      });
  }

  function handleDocumentClick(event) {
    var closeEl = event.target.closest("[data-close-drawer]");
    if (closeEl) {
      closeDrawer();
      return;
    }

    var actionEl = event.target.closest("[data-admin-action]");
    if (actionEl) {
      var action = actionEl.getAttribute("data-admin-action");
      if (action === "refresh") {
        actionEl.disabled = true;
        actionEl.textContent = "Refreshing…";
        loadResponses(true)
          .catch(function (error) {
            toast(error.message || "Could not refresh.");
            actionEl.disabled = false;
            actionEl.textContent = "Refresh";
          });
        return;
      }
      if (action === "logout") {
        api("/api/admin/logout", { method: "POST" })
          .catch(function () {
            /* ignore network issues; clear the screen anyway */
          })
          .then(function () {
            state.responses = [];
            renderLogin();
            toast("Signed out.");
          });
        return;
      }
      if (action === "export") {
        exportCsv();
        return;
      }
      if (action === "export-json") {
        exportJson();
        return;
      }
      if (action === "toggle-feedback") {
        state.showAllFeedback = !state.showAllFeedback;
        renderDashboard();
        return;
      }
      if (action === "delete") {
        deleteCurrent(actionEl.getAttribute("data-id"));
        return;
      }
    }

    var row = event.target.closest("[data-row-id]");
    if (row) {
      openDrawer(row.getAttribute("data-row-id"));
    }
  }

  function handleKeydown(event) {
    if (event.key === "Escape" && state.openId) {
      closeDrawer();
      return;
    }
    if (
      (event.key === "Enter" || event.key === " ") &&
      event.target.matches &&
      event.target.matches("[data-row-id]")
    ) {
      event.preventDefault();
      openDrawer(event.target.getAttribute("data-row-id"));
    }
  }

  function handleInput(event) {
    if (event.target && event.target.id === "table-search") {
      state.query = event.target.value;
      renderTable();
    }
  }

  function handleChange(event) {
    if (!event.target) return;
    if (event.target.id === "status-filter") {
      state.filter = event.target.value;
      renderTable();
    }
    if (event.target.id === "sort-order") {
      state.sort = event.target.value;
      renderTable();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */

  function loadResponses(silent) {
    if (!silent) {
      root.innerHTML =
        '<div class="admin-loading"><span class="spinner" aria-hidden="true"></span><p>Loading responses…</p></div>';
    }
    return api("/api/admin/responses")
      .then(function (data) {
        state.responses = Array.isArray(data.responses) ? data.responses : [];
        state.loadedAt = data.generatedAt || new Date().toISOString();
        renderDashboard();
        if (!silent) toast("Dashboard loaded.");
      })
      .catch(function (error) {
        if (error.status === 401) {
          renderLogin("Your session expired. Please sign in again.");
          return;
        }
        root.innerHTML =
          '<div class="admin-login"><div class="login-card panel"><h1>Cannot load the dashboard</h1>' +
          '<p class="login-copy">' +
          escapeHtml(error.message || "The server did not respond.") +
          "</p>" +
          '<p class="login-note">Check that the survey server is running, then reload this page.</p>' +
          "</div></div>";
      });
  }

  function boot() {
    api("/api/admin/session")
      .then(function (session) {
        if (!session.authenticated) {
          renderLogin();
          return;
        }
        return loadResponses();
      })
      .catch(function () {
        renderLogin("Could not reach the survey server. Is it running?");
      });
  }

  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleKeydown);
  document.addEventListener("input", handleInput);
  document.addEventListener("change", handleChange);
  document.addEventListener("submit", function (event) {
    if (event.target && event.target.id === "login-form") {
      handleLogin(event);
    }
  });

  boot();
})();
