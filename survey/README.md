# Covenant — Christian Dating Survey

A self-hosted survey app built for researching a **Christian dating app**. It turns the
companion survey in `../Dating App User Research Survey.docx` into a working, branching web
form with a password-protected research dashboard, live analysis and CSV/JSON export.

Built with plain HTML, CSS, JavaScript and a zero-dependency Node server, so there is
nothing to install and nothing to keep updated.

---

## Quick start

Requirements: **Node.js 18 or newer** (tested on Node 24).

Double-click **`start.bat`**, or from this folder:

```powershell
node server.js
```

Then open:

| Page | URL |
| --- | --- |
| Survey | http://localhost:4173/ |
| Dashboard | http://localhost:4173/admin |

The dashboard password defaults to **`covenant-admin`**. Change it before sharing the
survey — see [Admin password](#admin-password).

If you are sharing the survey with other people on your Wi-Fi, give them
`http://YOUR-COMPUTER-IP:4173/`. Windows may ask you to allow Node through the firewall.

---

## What was built

### Respondent experience

- **Warm, mobile-first design** in ivory, plum and gold; no external fonts or CDNs, so it
  works offline and loads instantly.
- **Branching logic** — never-users, lapsed users and current users each see the relevant
  sections. Everyone answers the motivator, pricing, open-feedback and follow-up sections.
- **Up to 7 short sections** (branching skips the ones that do not apply) with a progress
  bar, per-question validation and a final review page where answers can be edited before
  submitting.
- **Autosave** to the browser after every answer. Reloading or closing the tab shows a
  "Welcome back" resume banner instead of losing progress.
- **Accessible**: keyboard-friendly radio/checkbox cards, visible focus states, screen-reader
  labels, reduced-motion support, semantic fieldsets and live error messages.
- **Spam protection**: a honeypot field plus per-IP rate limiting. IP addresses are hashed,
  never stored raw.
- **Consent gate** (18+) with an expandable privacy explanation.
- Optional follow-up interview email, first name, and early-access waitlist opt-in.

### Researcher dashboard (`/admin`)

- Password login with an HttpOnly, SameSite=Strict, signed session cookie (12-hour session).
- **Decision gate KPI**: percentage of never/lapsed respondents rating 4–5 on intent to try,
  with a pass/fail badge against the PRD's 40% threshold.
- KPIs for total responses, average intent, interview opt-ins, waitlist requests and median
  completion time.
- Live charts for:
  - sample composition (never / lapsed / current) and faith intensity
  - top barriers and the single biggest deal-breaker
  - top motivators and the most important feature
  - importance ratings (averaged from 1–5)
  - willingness to pay and preferred pricing model
  - discovery preference and trust triggers
- **Open-text feed** for the four free-text questions, tagged and filtered by audience.
- **Response table** with search across every answer, status filter, sort order, and a detail
  drawer showing the complete response.
- **CSV and JSON export**, plus single-response deletion (with confirmation).
- Empty states that explain what to do before the first response arrives.

### Faith-tailored question set

The original 24-question survey was expanded and rewritten for a Christian audience while
keeping its research structure. New areas include:

- church attendance, denomination/tradition and faith centrality
- the "small pool of serious Christian matches" barrier
- people claiming faith but not living it; pressure to compromise values or boundaries
- faith-specific deal-breakers: verification of church involvement, denomination filters,
  boundaries features, accountability options
- comfort with disclosing denomination, church, purity stance, statement of faith or testimony
- how openly respondents present their faith on existing apps
- trust triggers specific to faith communities (church friends on the app, Christian leader
  endorsement)
- whether sharing a denomination is essential
- an ideal "meet a Christian partner online" open question

Twenty-eight questions are answered by a typical respondent (35 exist in total, with
branching), keeping the survey at roughly 5–7 minutes.

### Mapping to the PRD

The survey preserves the PRD's decision inputs:

| PRD decision | Survey questions |
| --- | --- |
| Positioning + P0 safety features | `barriers`, `barrier_top`, `experiences` |
| Core differentiation feature | `motivators`, `motivator_top` |
| Matching mechanic (FR-2.2) | `discovery` |
| Pricing and free-tier boundaries | `paid_before`, `price_ceiling`, `preferred_model` |
| Launch trust cues (Q20 equivalent) | `trust_triggers` |
| Decision gate (≥ 40% rate 4–5) | `try_likelihood` |

The decision gate is calculated only on never/lapsed respondents, matching section 12 of the
PRD. Unlike the original master document, motivators are shown to never-users too — the gate
depends on `try_likelihood`, which lives in that section, so excluding it would make the gate
impossible to calculate for the most important segment.

---

## Admin password

The default password is `covenant-admin` and is **not safe for a public link**. Set your own:

**PowerShell**

```powershell
$env:ADMIN_PASSWORD = "a-long-random-passphrase"
node server.js
```

**Command Prompt**

```bat
set ADMIN_PASSWORD=a-long-random-passphrase
node server.js
```

The password is only stored in memory. Changing it invalidates nothing else, but existing
sessions remain valid until they expire — sign out or restart to force a fresh login.

> `npm start` works too, but this machine's PowerShell blocks `npm.ps1`. Use
> `npm.cmd start`, or simply `node server.js`.

---

## Data and privacy

Responses are appended to **`data/responses.jsonl`** (one JSON object per line). The dashboard
reads this file directly. Back it up by copying the `data` folder.

- A response gets a random ID such as `CR-M4X2K9-8F3A`; there are no user accounts.
- Emails and first names are only captured if the respondent opts into follow-up.
- IP addresses are **hashed with a server secret** and truncated before storage.
- Browser user agent and referrer are stored for basic quality checks.
- The session secret lives in `data/.session-secret` (created on first run).
- Deletion from the dashboard rewrites the file without that response.

To wipe test data and start fresh, stop the server and delete `data/responses.jsonl`.

For production use:

1. Serve over HTTPS via a reverse proxy (Caddy, Nginx, Render, Railway, Fly.io).
2. Set `COOKIE_SECURE=1` so the session cookie is only sent over HTTPS.
3. Set a strong `ADMIN_PASSWORD`.
4. Keep the `data` directory on a **persistent disk**; most free hosts wipe ephemeral
   filesystems on redeploy.
5. Export and back up responses regularly. The JSONL file is the source of truth.
6. Review your local obligations (GDPR/UK GDPR/CCPA) for lawful basis, retention and deletion
   requests. The consent screen and privacy note are a starting point, not legal advice.

The server is single-instance by design. At 300–5,000 responses this is more than sufficient.
Beyond that, move `responses.jsonl` into a database and keep the same API shape.

---

## Editing the survey

All questions live in **`public/js/questions.js`**, which the server also reads for CSV
headers and validation. Edit it once and both sides stay in sync.

Question shape:

```js
{
  id: "church_attendance",          // stable key used in exports
  section: "screening",
  type: "single",                   // single | multi | scale | open | email
  title: "How often do you attend church or a faith community?",
  help: "Optional helper text",
  required: true,
  audience: "all",                  // all | history | barriers
  allowOther: true,                 // adds an "Other" text field
  visibleIf: { id: "interview", in: ["yes", "maybe"] },
  options: [{ value: "weekly", label: "Weekly or more" }],
  scale: { min: 1, max: 5, minLabel: "Not important", maxLabel: "Essential" }
}
```

- `audience: "history"` shows the question only to lapsed/current users.
- `audience: "barriers"` shows it only to never/lapsed users.
- Multi-select options can be marked `exclusive: true` (e.g. "None of these").
- Add a new section to the `sections` array; the progress bar adapts automatically.
- Scale questions support any 1–5 range; the UI renders five buttons.
- Sections with no visible questions are skipped.

After editing, restart the server. Asset URLs carry a restart-based version token, so browsers
pick up the change without a hard refresh. Responses already collected keep their original
answers; new questions simply show as empty in old rows and CSV columns.

Branding and copy live in **`public/js/brand.js`** (name, monogram, headline, privacy text,
thank-you message). Colours live at the top of `public/css/styles.css`.

---

## Project structure

```
survey/
  server.js                 zero-dependency HTTP server, API, CSV export, auth
  package.json
  start.bat                 double-click launcher for Windows
  public/
    index.html              survey shell
    admin.html              dashboard shell
    favicon.svg
    css/styles.css          shared design system + survey UI
    css/admin.css           dashboard UI
    js/brand.js             brand name and copy
    js/questions.js         all questions, options and branching (shared with server)
    js/survey.js            survey renderer, validation, autosave, submission
    js/admin.js             dashboard, charts, table, drawer, exports
  data/                     created at runtime
    responses.jsonl         collected responses
    .session-secret         generated signing secret
```

### API (used by the app)

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/responses` | Submit a completed response |
| `POST` | `/api/admin/login` | Exchange password for a session cookie |
| `GET` | `/api/admin/responses` | Full dataset (auth required) |
| `GET` | `/api/admin/export.csv` | Spreadsheet export with readable labels |
| `GET` | `/api/admin/export.json` | Raw export |
| `DELETE` | `/api/admin/responses/:id` | Delete one response |
| `GET` | `/api/health` | Health check |

The public submission endpoint validates required questions, option values, email format and
text lengths server-side — the browser is never trusted.

---

## Testing checklist

Before distributing the link:

1. Start the server and submit a **never-user** response. Confirm the history section is
   skipped and barriers appear.
2. Submit a **current user** response. Confirm barriers are skipped.
3. Answer "Someone else" in an "Other" option and confirm the text field is required.
4. Reload mid-survey and use **Continue draft**.
5. Try to continue with a required question blank; confirm the inline error and focus jump.
6. Submit, note the response ID, then sign in at `/admin` (default password
   `covenant-admin`) and find the response in the table.
7. Check the decision gate KPI updates only for never/lapsed respondents.
8. Export CSV and open it in Excel/Sheets; confirm labels and the BOM render correctly.
9. Delete the test response from the drawer and confirm it disappears from the data file.

---

## Notes and limitations

- The survey is anonymous by default, but the optional follow-up email makes a response
  identifiable. Treat exports accordingly.
- Because the dataset is a plain file, avoid running two server instances against the same
  folder.
- No email sending is built in; interview follow-up and waitlist invitations are manual from
  the exported CSV.
- Native app stores, user accounts and matching features are out of scope — this is the
  research instrument, not the dating product.
