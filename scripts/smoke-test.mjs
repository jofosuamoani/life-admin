#!/usr/bin/env node
/**
 * Post-deploy smoke test. Runs against a live Life Admin site and checks
 * auth, cookies, per-user isolation, task CRUD, SPA routing and security
 * headers. It deletes the tasks it creates; the two test accounts stay
 * (there's no delete-account feature yet), so reuse them on later runs.
 *
 * Usage (no dependencies, Node 22+):
 *   SMOKE_A_EMAIL=a@example.com SMOKE_A_PASSWORD=... \
 *   SMOKE_B_EMAIL=b@example.com SMOKE_B_PASSWORD=... \
 *   node scripts/smoke-test.mjs https://your-app.fly.dev
 *
 * Both emails must be allowed to sign up (SIGNUP_ALLOWED_EMAILS) for the
 * first run; after that the script just logs in.
 */

const BASE = (process.argv[2] ?? '').replace(/\/+$/, '');
const env = (k) => process.env[k] ?? '';
const A = { name: 'Smoke Test A', email: env('SMOKE_A_EMAIL'), password: env('SMOKE_A_PASSWORD') };
const B = { name: 'Smoke Test B', email: env('SMOKE_B_EMAIL'), password: env('SMOKE_B_PASSWORD') };
if (!BASE || !A.email || !A.password || !B.email || !B.password) {
  console.error('Usage: SMOKE_A_EMAIL=… SMOKE_A_PASSWORD=… SMOKE_B_EMAIL=… SMOKE_B_PASSWORD=… node scripts/smoke-test.mjs <site-url>');
  process.exit(2);
}
const isHttps = BASE.startsWith('https://');

let failed = 0;
function check(label, ok, detail = '') {
  if (!ok) failed++;
  console.log(`${ok ? '✔' : '✘'} ${label}${!ok && detail ? `  → ${detail}` : ''}`);
}

/** Minimal API client that keeps one session cookie, like a browser tab. */
function client() {
  let cookie = '';
  let setCookieHeader = '';
  return {
    get setCookie() {
      return setCookieHeader;
    },
    get cookie() {
      return cookie;
    },
    async req(method, path, body, extraHeaders = {}) {
      const res = await fetch(BASE + path, {
        method,
        redirect: 'manual',
        headers: {
          Origin: BASE,
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
          ...extraHeaders,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const sc = res.headers.get('set-cookie');
      if (sc) {
        setCookieHeader = sc;
        const pair = sc.split(';')[0];
        cookie = pair.endsWith('=') ? '' : pair; // cleared cookie → forget it
      }
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {}
      return { status: res.status, json, text, headers: res.headers };
    },
  };
}

async function signInOrUp(c, user) {
  const signup = await c.req('POST', '/api/auth/signup', user);
  if (signup.status === 201) return 'signed up';
  const login = await c.req('POST', '/api/auth/login', { email: user.email, password: user.password });
  if (login.status === 200) return 'logged in';
  throw new Error(`Couldn't sign up or log in ${user.email}: signup ${signup.status} ${signup.json?.error ?? ''}, login ${login.status} ${login.json?.error ?? ''}`);
}

console.log(`Smoke testing ${BASE}\n`);

// ---- Site, routing, headers
const home = await fetch(BASE + '/');
const homeHtml = await home.text();
check('Home page loads', home.status === 200 && homeHtml.includes('id="root"'), String(home.status));
for (const route of ['/tasks', '/tasks?category=Car', '/account', '/login']) {
  const r = await fetch(BASE + route);
  check(`Refreshing ${route} serves the app (not a 404)`, r.status === 200 && (await r.text()).includes('id="root"'), String(r.status));
}
const assetPath = homeHtml.match(/\/assets\/[^"]+\.js/)?.[0];
const asset = assetPath ? await fetch(BASE + assetPath) : null;
check('JS bundle loads, cached long-term', !!asset && asset.status === 200 && /immutable/.test(asset.headers.get('cache-control') ?? ''));
const h = home.headers;
check('Content-Security-Policy set', /default-src 'self'/.test(h.get('content-security-policy') ?? ''));
check('X-Content-Type-Options: nosniff', h.get('x-content-type-options') === 'nosniff');
check('Clickjacking protection (frame-ancestors none)', /frame-ancestors 'none'/.test(h.get('content-security-policy') ?? ''));
if (isHttps) {
  check('HSTS set', /max-age=\d+/.test(h.get('strict-transport-security') ?? ''));
  const insecure = await fetch(BASE.replace('https://', 'http://') + '/', { redirect: 'manual' }).catch(() => null);
  check('http:// redirects to https://', !!insecure && insecure.status >= 300 && insecure.status < 400 && (insecure.headers.get('location') ?? '').startsWith('https://'), String(insecure?.status));
}
const health = await fetch(BASE + '/api/health');
check('Health check OK', health.status === 200);
const notFound = await fetch(BASE + '/api/does-not-exist');
check('Unknown API route → JSON 404', notFound.status === 404 && (await notFound.json().catch(() => ({}))).error !== undefined);

// ---- Auth
const anon = client();
check('Tasks API requires login (401)', (await anon.req('GET', '/api/tasks')).status === 401);
check('/me without login → 401', (await anon.req('GET', '/api/auth/me')).status === 401);
const wrongPw = await anon.req('POST', '/api/auth/login', { email: A.email, password: 'definitely-wrong-password' });
check('Wrong password → generic 401', wrongPw.status === 401 && wrongPw.json?.error === 'Invalid email or password', `${wrongPw.status} ${wrongPw.json?.error}`);
const demo = await anon.req('POST', '/api/auth/login', { email: 'demo@lifeadmin.local', password: 'lifeadmin-demo' });
check('Demo account does not exist in production', demo.status === 401, String(demo.status));

const a = client();
const b = client();
console.log(`  (A ${await signInOrUp(a, A)}, B ${await signInOrUp(b, B)})`);
const sc = a.setCookie;
check('Session cookie is HttpOnly + SameSite=Lax', /HttpOnly/i.test(sc) && /SameSite=Lax/i.test(sc), sc);
if (isHttps) check('Session cookie is Secure with __Host- prefix', /Secure/i.test(sc) && sc.startsWith('__Host-'), sc);
const meA = await a.req('GET', '/api/auth/me');
check('Session persists: /me returns A', meA.status === 200 && meA.json?.email === A.email.toLowerCase(), JSON.stringify(meA.json));
check('No password hash in user data', meA.text && !/hash|password/i.test(meA.text), meA.text);

// ---- Task CRUD (as A)
const created = await a.req('POST', '/api/tasks', { title: 'Smoke test task', category: 'Car', priority: 'High', dueDate: '2030-01-15', user_id: 999999 });
check('Create task', created.status === 201 && created.json?.title === 'Smoke test task', `${created.status} ${created.text}`);
const id = created.json?.id;
const listA = await a.req('GET', '/api/tasks');
check('Task appears in A’s list', Array.isArray(listA.json) && listA.json.some((t) => t.id === id));
const edited = await a.req('PATCH', `/api/tasks/${id}`, { title: 'Smoke test task (edited)', category: 'Home', dueDate: null });
check('Edit task', edited.status === 200 && edited.json?.title === 'Smoke test task (edited)' && edited.json?.category === 'Home' && edited.json?.dueDate === null, edited.text);
check('Complete task', (await a.req('PATCH', `/api/tasks/${id}`, { completed: true })).json?.completed === true);
check('Uncomplete task', (await a.req('PATCH', `/api/tasks/${id}`, { completed: false })).json?.completed === false);
const again = await a.req('GET', `/api/tasks/${id}`);
check('Changes persisted (re-read from server)', again.json?.title === 'Smoke test task (edited)' && again.json?.completed === false);
const bad = await a.req('POST', '/api/tasks', { title: '', category: 'Nope' });
check('Invalid task rejected with 400', bad.status === 400);

// ---- Isolation (B tries A's task)
const listB = await b.req('GET', '/api/tasks');
check('B’s list does not contain A’s task', Array.isArray(listB.json) && !listB.json.some((t) => t.id === id));
check('B cannot read A’s task (404)', (await b.req('GET', `/api/tasks/${id}`)).status === 404);
check('B cannot edit A’s task (404)', (await b.req('PATCH', `/api/tasks/${id}`, { title: 'hacked' })).status === 404);
check('B cannot complete A’s task (404)', (await b.req('PATCH', `/api/tasks/${id}`, { completed: true })).status === 404);
check('B cannot delete A’s task (404)', (await b.req('DELETE', `/api/tasks/${id}`)).status === 404);
check('A’s task unchanged after B’s attempts', (await a.req('GET', `/api/tasks/${id}`)).json?.title === 'Smoke test task (edited)');

// ---- CSRF / origin
const forged = await a.req('POST', '/api/tasks', { title: 'forged', category: 'Car' }, { Origin: 'https://evil.example' });
check('Write from another website is blocked (403)', forged.status === 403, String(forged.status));

// ---- Delete + logout
check('Delete task', (await a.req('DELETE', `/api/tasks/${id}`)).status === 204);
check('Deleted task is gone', (await a.req('GET', `/api/tasks/${id}`)).status === 404);
const oldCookie = a.cookie;
check('Logout', (await a.req('POST', '/api/auth/logout')).status === 204);
const reused = await fetch(BASE + '/api/tasks', { headers: { Cookie: oldCookie } });
check('Old session cookie rejected after logout', reused.status === 401, String(reused.status));
await b.req('POST', '/api/auth/logout');

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
