# Life Admin Backlog & Decision Log

A running record of **what we've decided (and why)** and **what we've deferred or want
to consider later**. Update it whenever a decision is made or something is postponed.

- **Backlog:** check items off when done, adding the date. Don't delete them, so the history stays.
- **Decision log:** newest entries at the top of each milestone. Record the choice, the
  reason, and any trade-off we accepted.

---

## Backlog

### 🚀 Before deploying (must do)

*All done 2026-11-05. Live at https://life-admin-josh.fly.dev. See README → "Deploying to Fly.io"
and the decision log ("Deployment prep").*

- [x] **Do the first deploy.** *(Done 2026-11-05: https://life-admin-josh.fly.dev. If not done
      yet, run `npm run smoke` against it; see README.)*
- [x] Put the project in git and on GitHub. *(Done 2026-11-05: public repo
      https://github.com/jofosuamoani/life-admin, branch `main`. Each finished change is committed
      and pushed. Deploying stays a manual `fly deploy`.)*
- [ ] Auto-deploy from GitHub (a GitHub Action running `fly deploy` on push to `main`, with a
      `FLY_API_TOKEN` repo secret). Best added together with CI (typecheck, build, tests) so a
      broken push can't go live.
- [x] Run with `NODE_ENV=production`: Secure cookies, and the **demo account is disabled**.
      *(Done 2026-11-05: set in `fly.toml`. Checked that the demo login fails in production.)*
- [x] Serve over **HTTPS**. *(Done 2026-11-05: Fly terminates TLS. `force_https` redirects http,
      and HSTS is sent in production.)*
- [x] Set `TRUST_PROXY` for the host. *(Done 2026-11-05: `1` in `fly.toml` for Fly's edge proxy.
      The server warns at startup if it's unset in production.)*
- [x] Set `CLIENT_ORIGIN` to the real origin. *(Done 2026-11-05: in `fly.toml`. The server now
      refuses to start in production without it, or with a non-https one.)*
- [x] Decide how the frontend is served. *(Done 2026-11-05: Express serves `client/dist`, one
      origin.)*
- [x] Server build step. *(Done 2026-11-05: esbuild bundles `server/` + `shared/` into
      `server/dist/index.js`. `npm run build` builds both, and `npm start` runs it.)*
- [x] Database on persistent storage, plus **backups**. *(Done 2026-11-05: Fly volume at `/data`.
      Nightly snapshot (keep 14) plus Fly daily volume snapshots (14 days), and restore via
      `/data/restore.db`.)*
- [x] Security headers. *(Done 2026-11-05: by hand. Strict CSP with no 'unsafe-inline': React's
      `style={}` is applied via the DOM, which CSP allows. Also HSTS, frame-ancestors/X-Frame-Options,
      nosniff, Referrer-Policy, COOP/CORP, Permissions-Policy.)*
- [x] Rate-limit counters for multiple instances. *(N/A 2026-11-05: we run exactly one Fly machine.
      Still in memory, so they reset on deploy or restart. Revisit if we scale out.)*
- [x] Email verification and a CAPTCHA on signup. *(Deferred 2026-11-05: the first deploy is
      invite-only via `SIGNUP_ALLOWED_EMAILS`, and production sign-ups are closed by default. Both
      are now under "Before a public launch".)*

### 🌍 Before a public launch (open sign-ups)

- [ ] Email verification (needs an email provider, e.g. Resend or Postmark). Then always say
      "check your email" on signup, so it no longer reveals which emails are registered.
- [ ] CAPTCHA on signup (e.g. Cloudflare Turnstile). The CSP will need its domain added.
- [ ] Password reset (see Accounts). Without it, a forgotten password means asking the owner.
- [ ] Off-site backups (e.g. Litestream to S3/R2). Today's snapshots and Fly's volume snapshots
      both live with Fly.
- [ ] Uptime monitoring/alerts (e.g. a free health-check pinger on `/api/health`).
- [ ] Error alerting and log retention (e.g. Sentry, or shipping `fly logs` somewhere). Today a
      500 is only visible if someone is watching `fly logs`, and Fly keeps logs only briefly.
- [ ] Custom domain (`fly certs add`). Update `CLIENT_ORIGIN` when it changes.
- [ ] Privacy policy / terms if strangers' data is stored.

### 🔐 Security

- [ ] **Automated tests for data isolation** (User A can't read, change or delete User B's
      tasks) and for auth. Highest priority: everything is verified manually with curl today.
- [ ] Per-email login cap across all IPs (e.g. 20/hour) and/or a CAPTCHA after repeated
      failures, against attacks spread across many IPs (botnets). The current limits are per IP + email and per IP.
- [ ] Re-enter password before sensitive actions (connecting Gmail, viewing documents,
      deleting the account), once integrations exist.
- [ ] Two-factor authentication.
- [ ] Check new passwords against breached-password lists (HIBP k-anonymity API).
- [ ] Signup reveals whether an email is registered (409 response). Fine for now;
      revisit with email verification (e.g. always say "check your email").
- [ ] Rotate the session token when a session is extended (it currently keeps the same token).
- [ ] scrypt uses ~128 MB per hash; many concurrent logins could spike memory. Consider
      a concurrency cap on hashing.
- [ ] Audit log of logins, logouts and failed attempts.
- [ ] CSRF: currently SameSite=Lax plus an Origin check. Revisit (e.g. CSRF tokens) if
      the app ever spans multiple subdomains or needs cross-site requests.

### 👤 Accounts

- [ ] Password reset ("forgot password"), which needs email sending.
- [ ] Change password, and **revoke other sessions** when it changes.
- [ ] "Log out of all devices" / list of active sessions.
- [ ] Edit name and email on the Account page (currently read-only).
- [ ] Delete account (the database already cascades a user's tasks and sessions). Then also
      let `npm run smoke` delete its two test accounts afterwards; today they stay in the
      production database (with whatever tasks the last run left, which is none).

### ✅ Tasks & dashboard

- [x] **Edit an existing task** (title, category, due date, priority). *(Done 2026-11-04: edit
      dialog opened from the task title or pencil icon.)*
- [ ] Late-night greeting: 2 AM currently says "Good morning".
- [x] Onboarding for new accounts. *(Done 2026-11-04: "Welcome to Life Admin" empty state with a
      New task button. Optional example tasks still not offered.)*
- [ ] Notes/description field on tasks; recurring tasks (e.g. yearly renewals).
- [ ] Inbox and Settings pages are placeholders. *(2026-11-04: now deliberate "Coming soon" pages
      with planned features, marked "Soon" in the sidebar.)*
- [ ] Undo for delete (currently a confirmation dialog; completing a task already has Undo).
- [ ] Warn before closing the task dialog with unsaved changes.
- [ ] Search and filtering run in the browser over all tasks; move them to the API (with
      pagination) if task lists get large.

### 🎨 UX polish

- [x] The task-page error banner always adds "Is the API server running on port 4000?",
      even for unrelated errors. *(Fixed 2026-11-04: network failures get their own message.)*
- [x] Explain on the login page why you were sent there. *(Done 2026-11-04: "You've been logged
      out" / "Your session has ended…")*
- [x] Show the actual wait time when login or signup is rate-limited. *(Done 2026-11-05: live
      countdown that clears itself when the wait is over.)*
- [ ] The app uses the system font. Consider bundling a font (e.g. Inter) locally for a
      consistent look across devices (avoid a third-party font CDN for privacy).
- [x] An ended session (90-day cap, revoked) wasn't noticed until the next save, and task changes
      from another tab or device didn't show until a refresh. *(Done 2026-11-05: re-check and
      refresh on returning to the tab. See decision log.)*
- [ ] **Keep what the user typed when the session ends mid-edit.** If a create/edit form is open
      (or saved) when the session turns out to have ended, the user is sent to login and the
      draft is lost. Option: stash the draft in `sessionStorage` and offer to restore it after
      logging back in.
- [ ] Live updates while the tab stays open and visible (e.g. polling or server push). Today,
      another device's changes only arrive on return to the tab, on a save, or on a refresh.
      Probably only worth it once multi-device use or integrations (email, calendar) need it.
- [x] An empty account's dashboard flashed the full layout (stat cards, task rows, New task button)
      while loading, before the welcome screen. *(Fixed 2026-11-05: see decision log.)*
- [ ] "Remember where I was" survives only while the tab is open (router history state). Could
      use `sessionStorage` if that matters.

### 🛠 Engineering / tech debt

- [ ] Audit `global.css` for rules overridden by a later generic rule with the same selector
      weight (`.input`, `.icon-button`, `.button`). Two bugs so far: the sidebar X and the
      category filter width.
- [ ] Automated test suite and CI (typecheck, build, tests on every change). Includes **frontend
      tests** (e.g. Vitest + Testing Library) for the task dialogs, auth forms and redirect rules;
      the UI is currently verified by manual testing only.
- [ ] No linter (ESLint, including the React hooks rules) is configured.
- [x] Each page fetched its own copy of tasks. *(Fixed 2026-11-04: one shared `TasksProvider`
      for the signed-in area.)*
- [ ] `node:sqlite` is marked experimental in Node 24 (prints a warning). Watch for it
      going stable, or swap drivers. The repository layer keeps that change contained.
- [ ] Task data is shared via a hand-written context (`TasksProvider`). If more data types are
      added (emails, events, documents), consider a data-fetching library (e.g. TanStack Query)
      instead of one provider per type.
- [ ] Migrations are forward-only with no rollback. Take an automatic snapshot right before
      running pending migrations (today the startup backup only runs if the newest is over 24 h
      old). Until then: before a deploy that adds a migration, run
      `fly ssh console -C "ls -t /data/backups"` to check there's a recent snapshot.
- [ ] Scaling past one machine. Production must stay a single Fly machine (SQLite on its volume,
      in-memory rate limits). If that's ever outgrown: Postgres (e.g. Fly Postgres/Neon) behind the
      existing repository layer, plus shared rate-limit storage. Not needed for personal use.
- [ ] Dates are calendar dates in the browser's local time zone; the server has no notion of
      the user's time zone. This matters for reminders and notifications later.

### 🔮 Future milestones (AI, email, calendar, documents)

Notes to carry forward when building these:

- [ ] Every new user-owned table gets a `user_id` column, and **every query is scoped by it**
      (same pattern as tasks). Mount new routers behind `requireAuth`.
- [ ] AI and integrations should call **services** (e.g. `TaskService.create`), not
      repositories, so validation and ownership rules stay in one place.
- [ ] OAuth tokens (Gmail, Calendar) must be stored **encrypted**, with secrets in env/config.
- [ ] Links from emails to tasks rely on the "return to the page you came from after login"
      behaviour, so keep it working.
- [ ] Re-authentication before connecting accounts (see Security).

---

## Decision log

### Deployment prep (2026-11-05)

| Decision | Why / trade-off |
|---|---|
| **Source control** (2026-11-05): public GitHub repo `jofosuamoani/life-admin`, one branch (`main`). Every finished, tested change is committed and pushed. Deploys stay manual (`fly deploy`). | Public for the portfolio. Checked before the first push: only source and config are tracked, with no databases, `.env` files, keys or real emails. The invite list lives in a Fly secret, not the repo. Auto-deploy waits for CI (see Before deploying). |
| Production-readiness review (2026-11-05): 4xx errors from Express/body-parser (body too large, bad charset) now return 413/415 with fixed messages instead of 500 plus a logged stack trace. `CLIENT_ORIGIN` defaults to `https://$FLY_APP_NAME.fly.dev`. `.gitignore` covers databases, backups and keys anywhere in the repo. Added `npm run smoke` (live-site test: auth, isolation, CRUD, routing, headers). | Client mistakes shouldn't look like server bugs or fill the logs. No production URL is hard-coded. The post-deploy isolation check can be repeated. SQLite on a Fly volume kept: persistent, single machine, so no database migration is needed. |
| **Host: Fly.io**, one machine, SQLite on a 1 GB volume at `/data`. | Chosen over Railway/Render: real persistent volumes with built-in daily snapshots, automatic HTTPS, about $2–5/month. **Must stay one machine** (`fly deploy --ha=false`): a second machine gets a separate volume, so a split database. |
| Machine stops when idle (`min_machines_running = 0`). | Cheapest. The first request after idle takes ~1–2 s to wake it. In-memory rate-limit counters reset when it stops. Acceptable for a personal app. |
| **Express serves the built app** (`client/dist`) on the same origin as `/api`. | The cookie (SameSite=Lax, `__Host-`) and the CSRF origin check stay exactly as designed. Hashed `/assets/*` are cached for a year; `index.html` is `no-cache`, so deploys show up on the next load. |
| **Server bundled with esbuild** (`server/dist/index.js`, with sourcemaps). npm packages stay external, and `shared/` is bundled in. | esbuild was already installed (via tsx/Vite) and is now an explicit devDependency. The alternative, tsc plus building `shared/` as its own package, means more config for no gain. |
| Docker image runs as the unprivileged `node` user. The entrypoint chowns the root-owned Fly volume, then drops privileges with `setpriv`. | Avoids running the app as root. |
| **Invite-only sign-ups**: `SIGNUP_ALLOWED_EMAILS`. Production defaults to closed. `SIGNUP_OPEN=true` opens it to everyone. | The first deploy is for the owner and invited people, so email verification and a CAPTCHA (which need third-party services) wait for a public launch. The invite check runs before the "already registered" check, so uninvited people can't probe which emails exist. |
| Production config is validated at startup: `CLIENT_ORIGIN` required and https (localhost excepted). A warning if `TRUST_PROXY` is unset. | Better to fail loudly at deploy than ship broken writes or shared rate limits. |
| **Security headers by hand** (no helmet). Strict CSP: `default-src 'self'`, no inline scripts or styles. | Vite's build has no inline code, and React's `style={}` goes through the DOM, which CSP allows. Verified in Chrome: no CSP violations across signup, tasks and dashboard. |
| Session cookie is `__Host-la_session` when Secure (production). | Browsers then guarantee Secure, Path=/ and no Domain, so other subdomains can't plant or overwrite it. Dev keeps `la_session` (plain http). |
| **Backups:** nightly SQLite online-backup snapshot to `/data/backups` (keep 14; also taken at startup if the newest is over 24 h old, since an idle-stopped machine may miss the timer). Plus Fly volume snapshots (14 days). | No extra services. The online backup is consistent while the app runs, unlike copying the file. Both copies are with Fly, so off-site backups are in "Before a public launch". |
| **Restore:** put a snapshot at `/data/restore.db` and restart. The server swaps it in before opening the database, and keeps the old one as `pre-restore-<time>.db`. | Fly machines can't be shelled into while stopped, so restoring through the app's own startup is the safe path. Tested end to end. |
| VM memory 512 MB. | scrypt uses ~128 MB per hash, so 256 MB could run out of memory with two simultaneous logins. |

### Milestone 2.5: MVP polish (2026-11-04)

| Decision | Why / trade-off |
|---|---|
| **Rate-limit wait time** (2026-11-05): a 429 says how long is left ("…Please try again in 12 minutes."). It also returns `details: { reason, retryAfterSeconds }` alongside the `Retry-After` header. The login and signup pages count down live (minutes, then seconds) and remove the message when the wait is over. | The old text always said "15 minutes" / "an hour", even with 2 minutes left. The submit button stays enabled: the login lock is per email, so trying a different account is legitimate, and a blocked attempt doesn't extend the wait. |
| **Re-check on return** (2026-11-05): after the user has been away from the tab for ≥ 1 minute, `AuthProvider` quietly re-checks the session (`GET /auth/me`) and `TasksProvider` refreshes the task list. Both use one shared `useOnReturn` hook. | Matches common practice (Gmail, Notion, Linear). The login check is separate from the task data so future features (Inbox, Documents) can each refresh their own data with the same hook. Silent: no spinner, and network errors are ignored. A refresh that started before a local change is discarded, so it can't undo the change. Not done: polling or live updates, a countdown to expiry (overkill with 30-day sliding sessions). |
| Login redirect rejects paths starting with `//` (they'd be read as another website). Mistyped `//tasks` URLs therefore land on the dashboard. | Deliberate open-redirect protection. Collapsing duplicate slashes would be safe if it ever matters. |
| The "Log in" and "Create an account" links pass the remembered page along (2026-11-05 fix). | Switching between login and signup used to drop it, so login landed on the dashboard. The remembered page lives in router history state, so it's still lost if the tab is closed. That's acceptable; sessionStorage could keep it if needed. |
| The login page's "logged out" / "session ended" notice is dismissed on the first login attempt (2026-11-05 fix). | It used to be hidden only while an error showed, so it flashed back during each retry. |
| **Dashboard loading placeholder matches what's coming** (2026-11-05): the browser remembers per user whether they had any tasks last time (`localStorage` `la:hasTasks:<id>`, yes/no only). Had tasks: stat-card and task-row placeholders, as before. No tasks, or unknown (first visit, new device, private mode): a plain card with a spinner, sized like the welcome card, and no header New task button. | An empty account flashed the full layout before the welcome screen, which was most noticeable on a cold start. Only a yes/no is stored, never task data, and every storage access is guarded. If the guess is wrong (tasks added on another device), it just shows the other placeholder briefly. |
| Tasks category filter is a fixed compact width on desktop (170px) (2026-11-05 fix). On phones it sizes to its longest option (`width: auto`), because the fixed 150px clipped "All categories" on iPhone, where Safari adds its own arrow and padding. | It was stretching because the generic `.input { width: 100% }` rule overrode it. Follow-up: audit `global.css` for other rules placed before a generic rule that overrides them (see Engineering). |
| Sidebar close (X) button only appears while the mobile drawer is open (2026-11-05 fix). | It was always visible because the generic `.icon-button` rule overrode its `display: none`. |
| Components split into `components/ui` (generic), `components/layout`, `components/tasks`. | Clear home for reusable pieces as the app grows. |
| One `TasksProvider` inside the signed-in layout holds task data and the **single** create/edit dialog and delete confirmation. | No refetch or flicker between pages, consistent behaviour everywhere, and no hidden dialog per task row. Being inside the signed-in layout means it's discarded on logout, so no user's data lingers for the next. |
| Create and edit happen in a modal dialog (native `<dialog>`); delete keeps a confirmation; completing shows a toast with **Undo**. | Familiar SaaS patterns. Delete is permanent, so it confirms; completing is easily reversible, so it doesn't. |
| Small toast system (`lib/toast.tsx`) instead of a library. | Covers success, error and Undo in ~100 lines; no new dependency. |
| Task filters (status, category, search) live in the **URL**. | Survive refresh, and the dashboard can link straight to a filtered view (e.g. a category). |
| Light sidebar; it becomes a slide-in drawer below 900px. Account section stays at the bottom (avatar + name + "Account" → Account page; separate logout button). | Matches modern productivity apps; on mobile the full account section is still reachable. |
| Row actions appear on hover for mouse users and are always visible on touch devices (`@media (hover: hover)`). | The old version hid them on tablets and touch laptops. |
| Login errors stay generic ("Incorrect email or password"). Signup still says when an email is taken. | Login doesn't reveal accounts. Signup's message is a usability trade-off until email verification exists (see Security). |
| After a logout notice is shown, the "logged out on purpose" flag is cleared. | Bug fix: previously, opening a bookmark after logging out sent you to the dashboard instead of the bookmarked page. |
| Network failures show "Can't reach Life Admin right now…" instead of the raw "Failed to fetch". 5xx errors show a generic message. | Clear messages without leaking server details. |
| Unknown URLs inside the app show a "Page not found" page instead of silently redirecting. | Less confusing. |
| Server, shared schemas and auth were **not changed** in this pass. | Auth and isolation behaviour stays exactly as tested in Milestone 2 (re-verified with the regression script). |

### Milestone 2: Authentication & multi-user (2026-11-04)

| Decision | Why / trade-off |
|---|---|
| Login limits: **5 failures per IP + email** and **50 failures per IP** per 15 min. Successful logins and requests blocked with 429 don't count. | Counting per IP alone meant everyone behind one IP (including all accounts in dev, via the Vite proxy) shared 5 attempts. Counting per email alone would let anyone lock a victim out. Botnets spread across many IPs aren't covered yet (see Security). |
| `TRUST_PROXY` setting, off by default; `true` refused at startup. | Behind a reverse proxy, the real client IP has to come from `X-Forwarded-For`, but only from a proxy we trust; otherwise clients could fake their IP to avoid limits. |
| Signup limit: **10 attempts per IP per hour**, all attempts count. | Typical range is 3–10 per hour. Rejected attempts count because they're how someone would check which emails are registered. Real protection will be email verification and CAPTCHA. |
| Sessions: **30-day** expiry, extended on use after halfway, **hard cap of 90 days** after login. | Normal for a consumer productivity app. Without the cap, a session that keeps being used never ended. |
| After login: **return to the original page** if the user was sent to login (expired session, bookmark, deep link); **dashboard** if they logged out on purpose, signed up, or went to `/login` directly. The route guards make this decision in one place. | Standard behaviour. Keeping it in the guards removes a dependence on React update order. Paths are restricted to the app itself (no open redirects). |
| Server-side sessions in SQLite with an opaque token in an **HttpOnly, SameSite=Lax** cookie; only the token's **SHA-256 hash** is stored. Chosen over JWT. | Revocable (logout really ends the session), and the token can't be read by page scripts. A leaked database doesn't expose live sessions. Fits the same-origin setup (Vite proxy). |
| Password hashing with Node's built-in **scrypt** (N=2¹⁷, r=8, p=1), parameters stored with each hash. | OWASP-recommended, no native dependency (vs bcrypt/argon2). Parameters can be raised later. Costs ~128 MB and ~0.3s per hash. |
| Login with an unknown email still runs a password check against a throwaway hash; a single "Invalid email or password" message. | Response timing and wording don't reveal which emails are registered. |
| CSRF defence: SameSite=Lax cookie plus an **Origin header check** on writes. | Defence in depth without CSRF tokens. |
| Another user's task returns **404**, not 403. Owner comes from the session only; `user_id` in request bodies is stripped. | Doesn't reveal that the task exists; prevents reassigning ownership. |
| Existing tasks from before accounts moved to a **dev-only demo account**; new accounts start empty. | Kept existing data without leaving tasks without an owner. The demo account is never created in production. |
| Account details on an **Account** page (reached from the avatar/name in the sidebar), with a logout button there too. Email removed from the sidebar. | Keeps the sidebar uncluttered. |
| No new npm dependencies for auth (own cookie parser, rate limiter and scrypt wrapper). | Requirement for this milestone: no unnecessary libraries. |

### Milestone 1: MVP (2026-11-04)

| Decision | Why / trade-off |
|---|---|
| Tasks-page counts follow the selected category. | Each tab shows how many tasks you'd see if you clicked it. |
| Shared clock (`ClockProvider`) checks every minute and when the tab regains focus; only redraws when the hour or date changes. | Keeps the greeting, "Today/Overdue" labels and dashboard counts correct in a tab left open, without redrawing every minute. |
| In-app confirmation dialog (native `<dialog>`) instead of `window.confirm`. | Matches the theme; focus handling and Esc for free. Cancel is focused by default. |
| **zod 4** (upgraded from 3). | A high-severity advisory affected zod 3. Note: in zod 4, `.partial()` keeps `.default()` values, so the update schema is built from a base with no defaults (this caused a bug where PATCH reset fields). |
| **Node's built-in `node:sqlite`** instead of `better-sqlite3`. | No native compile step. Requires Node ≥ 22.13 and prints an "experimental" warning. Hidden behind a repository layer. |
| npm-workspaces monorepo: `shared/`, `server/`, `client/`; shared zod schemas are the single source of truth for types and validation. | Client and server can't drift apart. |
| Server organised by feature module: repository → service → routes. | Room to add future modules (inbox, calendar, documents, assistant) the same way. |
| Forward-only, numbered migrations in `server/src/db/migrations.ts`. | Simple and predictable; never edit shipped migrations. |
| Due dates are `YYYY-MM-DD` and optional. | Not every life-admin task has a deadline. |
