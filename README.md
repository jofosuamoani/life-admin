# Life Admin

A personal life-management dashboard. Users sign up, log in, and manage their
own tasks across life categories (Career, Money, Health, Home, Car, Documents, Personal).

- **Frontend:** React 19 + TypeScript + Vite (`client/`)
- **Backend:** Node.js + Express 5 + TypeScript (`server/`)
- **Database:** SQLite, using Node's built-in `node:sqlite` (no native build step)
- **Shared:** domain types and zod validation used by both sides (`shared/`)
- **Auth:** email + password (scrypt-hashed), server-side sessions in an HttpOnly cookie

See [BACKLOG.md](BACKLOG.md) for decisions made so far and what's planned or deferred.

## Requirements

- Node.js **22.13 or newer** (Node 24 recommended), which includes `node:sqlite`
- npm 10+

## Running locally

From the project root:

```bash
npm install        # installs all workspaces (shared, server, client)
npm run dev        # starts the API and the web app together
```

Then open **http://localhost:5173**. You'll land on the login page.

To run the two halves in separate terminals:

```bash
# Terminal 1 — API on http://localhost:4000
npm run dev:server

# Terminal 2 — web app on http://localhost:5173 (proxies /api → :4000)
npm run dev:client
```

### Demo account (development only)

In development the server makes sure this account exists and has example tasks:

- **Email:** `demo@lifeadmin.local`
- **Password:** `lifeadmin-demo`

It is never created when `NODE_ENV=production`, and you can turn it off with
`SEED_DEMO_DATA=false`. New accounts you create start empty.

To wipe everything (all users, sessions, tasks) and re-create the demo account:

```bash
npm run db:reset
```

Other scripts: `npm run typecheck` (all packages), `npm run build` (web app → `client/dist`,
server → `server/dist`) and `npm start` (runs the built server).

To try the production build locally (one server on :4000 serving the app and the API):

```bash
npm run build
NODE_ENV=production CLIENT_ORIGIN=http://localhost:4000 SIGNUP_OPEN=true \
  DATABASE_PATH=/tmp/life-admin-prod.db npm start
```

> Node prints `ExperimentalWarning: SQLite is an experimental feature`. That's
> expected and harmless.

### Configuration (optional env vars, server)

| Variable         | Default                         | Notes |
| ---------------- | ------------------------------- | ----- |
| `PORT`           | `4000`                          | |
| `DATABASE_PATH`  | `server/data/life-admin.db`     | |
| `CLIENT_ORIGIN`  | `http://localhost:5173`         | The site's public origin: CORS + allowed `Origin` for writes. **Required in production**, and must be `https://` (except localhost). |
| `NODE_ENV`       | (unset)                         | `production`: Secure `__Host-` cookie, HSTS, serves the built app, nightly backups, no demo account, sign-ups closed unless configured |
| `SEED_DEMO_DATA` | `true` (dev only)               | `false` to skip the demo account |
| `SECURE_COOKIES` | `true` in production            | Force the cookie `Secure` flag on/off |
| `TRUST_PROXY`    | (unset: off)                    | Set when behind a reverse proxy so rate limits see real client IPs: a hop count (`1`) or proxy addresses (`loopback`, `10.0.0.0/8`). `true` is refused as unsafe. |
| `SIGNUP_ALLOWED_EMAILS` | (unset)                  | Comma-separated emails allowed to sign up (invite-only). |
| `SIGNUP_OPEN`    | open in dev, closed in production | `true` lets anyone sign up. Ignored when `SIGNUP_ALLOWED_EMAILS` is set. |
| `SERVE_CLIENT`   | `true` in production            | Serve `client/dist` from the API server (one origin). |
| `BACKUPS`        | `true` in production            | Nightly database snapshot (SQLite online backup). |
| `BACKUP_DIR`     | `<database dir>/backups`        | |
| `BACKUP_KEEP`    | `14`                            | Snapshots to keep; older ones are deleted. |

## Authentication

- **Passwords** are hashed with scrypt (N=2¹⁷, r=8, p=1, random 16-byte salt) using
  Node's built-in `crypto`. Plaintext passwords are never stored or logged.
- **Sessions:** on login or signup the server generates a random 256-bit token, stores
  its **SHA-256 hash** in the `sessions` table, and sends the raw token in a cookie named
  `la_session` with the `HttpOnly` and `SameSite=Lax` flags. In production it's
  `__Host-la_session`, and also `Secure`.
  Sessions last 30 days and are extended on use once past halfway, but never beyond
  **90 days after login**, at which point the user must log in again. Logout deletes the
  session row, so the token stops working immediately.
- **Authorization:** every `/api/tasks` route requires a valid session. The user id
  always comes from the session, never from the request, and every SQL statement is
  scoped with `user_id = ?`. Another user's task returns `404`, the same as a task that
  doesn't exist.
- **CSRF:** the `SameSite=Lax` cookie, plus a server check that rejects
  state-changing requests whose `Origin` header isn't the app's.
- **Brute force:** login allows 5 failed attempts per **IP + email** and 50 per IP every
  15 minutes (successful logins don't count). Signup allows 10 attempts per IP per hour. Login failures always say "Invalid email or password" and take the
  same time whether or not the email exists.

## REST API

| Method | Path                | Auth | Description |
| ------ | ------------------- | ---- | ----------- |
| GET    | `/api/health`       | –    | Health check |
| POST   | `/api/auth/signup`  | –    | `{ name, email, password }` → 201 user, sets cookie |
| POST   | `/api/auth/login`   | –    | `{ email, password }` → 200 user, sets cookie |
| POST   | `/api/auth/logout`  | –    | Revokes the session, clears the cookie → 204 |
| GET    | `/api/auth/me`      | ✔    | Current user, or 401 |
| GET    | `/api/tasks`        | ✔    | Your tasks. Query: `status=all\|open\|completed`, `category=Money` |
| GET    | `/api/tasks/:id`    | ✔    | One of your tasks (404 otherwise) |
| POST   | `/api/tasks`        | ✔    | `{ title, category, dueDate?, priority?, completed? }` |
| PATCH  | `/api/tasks/:id`    | ✔    | Partial update, e.g. `{ "completed": true }` |
| DELETE | `/api/tasks/:id`    | ✔    | 204 |

Errors are JSON `{ error, details? }`: 400 validation, 401 not logged in or bad credentials,
403 disallowed origin, 404 not found or not yours, 409 email already registered, 429 rate limited
(includes a `Retry-After` header and `details: { reason, retryAfterSeconds }`).

```bash
curl -c jar.txt -X POST localhost:4000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"demo@lifeadmin.local","password":"lifeadmin-demo"}'
curl -b jar.txt localhost:4000/api/tasks
```

## Deploying to Fly.io

Production is **one Fly machine** running one Node server. It serves the built web app and
`/api` from the same origin, with the SQLite database on a Fly volume mounted at `/data`.
Fly provides HTTPS (and redirects http → https). The config is in `fly.toml` and `Dockerfile`.

**One machine only.** Each machine gets its own volume, so a second machine would have a
separate database. Rate-limit counters are also in memory per machine.

**Production environment variables.** Everything else has a safe default.

| Variable | Where | Value |
|---|---|---|
| `NODE_ENV` | `fly.toml` (set) | `production` |
| `PORT` | `fly.toml` (set) | `8080` (matches `internal_port`) |
| `DATABASE_PATH` | `fly.toml` (set) | `/data/life-admin.db` (on the volume) |
| `TRUST_PROXY` | `fly.toml` (set) | `1` (Fly's edge proxy) |
| `SIGNUP_ALLOWED_EMAILS` | **`fly secrets set`** (you) | Emails allowed to sign up, comma-separated |
| `CLIENT_ORIGIN` | only with a custom domain | Defaults to `https://<app>.fly.dev` via Fly's `FLY_APP_NAME` |

There are no secret keys: sessions are random tokens stored in the database. Never commit
`.env` files or databases (`.gitignore` covers them).

First deploy:

```bash
brew install flyctl
fly auth signup                         # or: fly auth login
# Edit fly.toml: set `app` to a unique name, and optionally primary_region (fly platform regions)
fly apps create <app-name>
fly volumes create life_admin_data --region <region> --size 1
fly secrets set SIGNUP_ALLOWED_EMAILS="you@example.com"
fly deploy --ha=false
```

Then open `https://<app-name>.fly.dev` and sign up with an invited email. To invite someone
else, update `SIGNUP_ALLOWED_EMAILS` (`fly secrets set` restarts the app). Later deploys are
just `fly deploy`.

**After deploying, run the smoke test** against the live site. It checks auth, cookies,
user isolation, task create/edit/complete/delete, page refresh on app routes, and security
headers. Invite two test emails first (they stay as test accounts):

```bash
fly secrets set SIGNUP_ALLOWED_EMAILS="you@example.com,smoke-a@example.com,smoke-b@example.com"
SMOKE_A_EMAIL=smoke-a@example.com SMOKE_A_PASSWORD='<choose one>' \
SMOKE_B_EMAIL=smoke-b@example.com SMOKE_B_PASSWORD='<choose one>' \
npm run smoke -- https://<app-name>.fly.dev
```

**Backups:** two layers, both on by default.

- The app writes a consistent snapshot to `/data/backups` nightly and on startup if the last
  one is over a day old. It keeps 14.
- Fly takes daily snapshots of the whole volume, kept 14 days (`snapshot_retention`).

To restore:
- **Download a snapshot:** `fly ssh sftp get /data/backups/<file>.db`.
- **Roll back the live database to a snapshot:**

  ```bash
  fly ssh console -C "cp /data/backups/<file>.db /data/restore.db"
  fly apps restart <app-name>
  ```

  On startup the server swaps `restore.db` in before opening the database. It keeps the
  replaced database as `/data/pre-restore-<time>.db`, so the restore can be undone the
  same way.
- **Restore a whole volume:** `fly volumes snapshots list <volume-id>`, then create a new
  volume from a snapshot.

**Logs:** `fly logs`. **Shell:** `fly ssh console`.

## Project structure

```
Dockerfile, fly.toml          Production image and Fly.io config (see "Deploying to Fly.io")
shared/src/
  task.ts                     Task types, enums, zod schemas
  auth.ts                     PublicUser type, signup/login schemas
server/src/
  index.ts                    Entry point: open DB, seed (dev), prune sessions, listen
  app.ts                      Express app: origin check, session middleware, routers
  config.ts                   Env-driven config (future API keys go here)
  db/                         connection (+ restore.db swap-in), forward-only migrations, backups, dev seed, reset
  lib/                        errors, password hashing, cookie parsing
  middleware/                 error handler, rate limiter, origin (CSRF) check, security headers, serve built app
  modules/auth/               users + sessions repos → AuthService → routes, middleware
  modules/tasks/              repository (user-scoped SQL) → service → routes (requireAuth)
  types/express.d.ts          req.user / req.sessionId typings
client/src/
  api/                        fetch wrapper (401 + network errors) + typed auth/tasks clients
  lib/                        auth (session state), clock, toast, forms, dates, task helpers
  components/ui/              generic: Modal, ConfirmDialog, Alert, FormField, EmptyState, Skeleton, …
  components/layout/          Layout (mobile drawer), Sidebar, AuthLayout, RouteGuards
  components/tasks/           TasksProvider (shared data + dialogs), TaskList/Item/Form, badges
  pages/                      Dashboard, Tasks, Account, Login, Signup, Inbox/Settings (coming soon), 404
  styles/global.css           Design tokens, components, light/dark themes, responsive rules
```

### Extending it

1. Add a migration in `server/src/db/migrations.ts` (append only).
2. Create `server/src/modules/<feature>/` with the same repository → service → routes layering.
   Give user-owned tables a `user_id` column and scope every query by it.
3. Mount its router in `server/src/app.ts` and apply `requireAuth`.
4. Put shared types and schemas in `shared/src/` and export them from `shared/src/index.ts`.
