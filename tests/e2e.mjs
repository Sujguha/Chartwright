/**
 * End-to-end test of Chartwright on a temporary local D1 database and R2 bucket.
 * Run: npm test
 */
import { getPlatformProxy } from 'wrangler';
import fs from 'node:fs';
import app from '../src/index.js';

const { env: raw, dispose } = await getPlatformProxy({ configPath: new URL('../wrangler.jsonc', import.meta.url).pathname, persist: false });

// A predictable stand-in for Cloudflare's rate limiter, so the test can check the limits exactly.
function fakeLimiter(limit) {
  const hits = new Map();
  return { async limit({ key }) { const n = (hits.get(key) || 0) + 1; hits.set(key, n); return { success: n <= limit }; } };
}
const env = { ...raw, BETTER_AUTH_SECRET: 'test-secret-'.repeat(4), BASE_URL: 'https://chartwright.de', PRO_ENABLED: 'true',
  AUTH_LIMITER: fakeLimiter(10), API_LIMITER: fakeLimiter(300), ASSETS: { fetch: async () => new Response('asset') } };

for (const n of fs.readdirSync(new URL('../migrations/', import.meta.url)).filter((f) => f.endsWith('.sql')).sort())
  for (const st of fs.readFileSync(new URL('../migrations/' + n, import.meta.url), 'utf8')
    .split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')   // drop comment lines first
    .split(';').map((s) => s.trim()).filter(Boolean))
    await env.DB.prepare(st).run();

const jar = {};
let ipCounter = 0;
async function call(who, method, path, body, ip) {
  const headers = { Origin: 'https://chartwright.de', 'cf-connecting-ip': ip || '10.0.0.' + (++ipCounter % 250) };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (who && jar[who]) headers.Cookie = jar[who];
  const r = await app.fetch(new Request('https://chartwright.de' + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env);
  const sc = r.headers.getSetCookie ? r.headers.getSetCookie() : [];
  if (who && sc.length) jar[who] = sc.map((c) => c.split(';')[0]).join('; ');
  let data = null; try { data = await r.json(); } catch {}
  return { s: r.status, d: data };
}
const results = [];
const check = (label, cond, extra = '') => results.push((cond ? 'PASS ' : 'FAIL ') + label + (extra !== '' ? '  ' + extra : ''));
const V = '/api/v1';

// ---- accounts ----
for (const who of ['alice', 'bob', 'carol', 'dave'])
  check('sign-up ' + who, (await call(who, 'POST', V + '/auth/sign-up/email', { name: who[0].toUpperCase() + who.slice(1), email: who + '@example.com', password: 'correct-horse-9' })).s === 200);
check('short password rejected', (await call(null, 'POST', V + '/auth/sign-up/email', { name: 'X', email: 'x@example.com', password: 'short' })).s >= 400);
check('wrong password rejected', (await call('tmp', 'POST', V + '/auth/sign-in/email', { email: 'alice@example.com', password: 'wrong-password-1' })).s === 401);
check('log-in alice', (await call('alice', 'POST', V + '/auth/sign-in/email', { email: 'alice@example.com', password: 'correct-horse-9' })).s === 200);
check('old unversioned address is gone', (await call('alice', 'GET', '/api/me')).s === 404);

// ---- workspace, roles, invitations ----
const org = await call('alice', 'POST', V + '/auth/organization/create', { name: 'Orbit Delivery', slug: 'orbit-delivery' });
check('alice creates workspace', org.s === 200 && !!org.d.id);
const ws = org.d.id;
check('alice is admin', (await call('alice', 'GET', V + '/me')).d.workspaces[0].role === 'admin');
const invB = await call('alice', 'POST', V + '/auth/organization/invite-member', { email: 'bob@example.com', role: 'editor', organizationId: ws });
const invC = await call('alice', 'POST', V + '/auth/organization/invite-member', { email: 'carol@example.com', role: 'viewer', organizationId: ws });
check('invites sent', invB.s === 200 && invC.s === 200);
check('bob accepts', (await call('bob', 'POST', V + '/auth/organization/accept-invitation', { invitationId: invB.d.id })).s === 200);
check('carol accepts', (await call('carol', 'POST', V + '/auth/organization/accept-invitation', { invitationId: invC.d.id })).s === 200);
check('dave cannot use bob’s invitation', (await call('dave', 'POST', V + '/auth/organization/accept-invitation', { invitationId: invB.d.id })).s >= 400);
check('viewer cannot invite', (await call('carol', 'POST', V + '/auth/organization/invite-member', { email: 'eve@example.com', role: 'viewer', organizationId: ws })).s === 403);

// ---- dashboards: D1 + R2 ----
const cfg = (n) => ({ app: 'chartwright', kind: 'dashboard', format: 1, cols: [{ name: 'A', type: 'number' }], rows: Array.from({ length: n }, (_, i) => [i]), charts: [], kpis: [], filters: {} });
const D = `${V}/workspaces/${ws}/dashboards`;
const created = await call('bob', 'POST', D, { name: 'Release 26.10', config: cfg(3) });
check('editor creates dashboard', created.s === 201 && created.d.version === 1);
const dId = created.d.id;
const meta = await env.DB.prepare('SELECT content_key, size_bytes FROM dashboard WHERE id = ?1').bind(dId).first();
check('content stored in R2, metadata in D1', !!(await env.BLOBS.get(meta.content_key)) && meta.size_bytes > 0, meta.content_key);
const read = await call('carol', 'GET', `${D}/${dId}`);
check('viewer opens dashboard with content from R2', read.s === 200 && read.d.dashboard.config.rows.length === 3 && read.d.role === 'viewer');
check('viewer lists dashboards', (await call('carol', 'GET', D)).d.dashboards.length === 1);
check('viewer cannot create', (await call('carol', 'POST', D, { name: 'X', config: cfg(1) })).s === 403);
check('viewer cannot edit', (await call('carol', 'PUT', `${D}/${dId}`, { name: 'Hacked', config: cfg(1) })).s === 403);
check('viewer cannot delete', (await call('carol', 'DELETE', `${D}/${dId}`)).s === 403);
check('outsider gets not found', (await call('dave', 'GET', `${D}/${dId}`)).s === 404);
check('logged-out gets 401', (await call(null, 'GET', D)).s === 401);
check('invalid dashboard rejected', (await call('bob', 'POST', D, { name: 'X', config: { hello: 1 } })).s === 400);
const big = { ...cfg(1), rows: [['x'.repeat(11 * 1024 * 1024)]] };
check('dashboard over 10 MB rejected', (await call('bob', 'POST', D, { name: 'Huge', config: big })).s === 413);
const mid = cfg(1); mid.rows = [['y'.repeat(3 * 1024 * 1024)]];
check('3 MB dashboard accepted (above the old D1 row limit)', (await call('bob', 'POST', D, { name: 'Large', config: mid })).s === 201);

const upd = await call('bob', 'PUT', `${D}/${dId}`, { name: 'Release 26.10 (final)', config: cfg(5), version: 1 });
check('editor updates with version check', upd.s === 200 && upd.d.version === 2);
check('old content version removed from R2', !(await env.BLOBS.get(meta.content_key)));
check('stale edit rejected (conflict)', (await call('bob', 'PUT', `${D}/${dId}`, { name: 'Stale', config: cfg(1), version: 1 })).s === 409);
check('updated content readable', (await call('carol', 'GET', `${D}/${dId}`)).d.dashboard.config.rows.length === 5);

const carolMember = (await env.DB.prepare('SELECT id FROM member WHERE organizationId=?1 AND userId=(SELECT id FROM user WHERE email=?2)').bind(ws, 'carol@example.com').first()).id;
check('editor cannot change roles', (await call('bob', 'POST', V + '/auth/organization/update-member-role', { memberId: carolMember, role: 'admin', organizationId: ws })).s === 403);
check('admin promotes carol to editor', (await call('alice', 'POST', V + '/auth/organization/update-member-role', { memberId: carolMember, role: 'editor', organizationId: ws })).s === 200);
check('carol (now editor) can create', (await call('carol', 'POST', D, { name: 'Carol’s view', config: cfg(1) })).s === 201);

const aud = await call('alice', 'GET', `${V}/workspaces/${ws}/audit`);
check('admin sees audit log', aud.s === 200 && aud.d.entries.length === 4, aud.d && aud.d.entries.map((e) => e.action).join(','));
check('editor cannot see audit log', (await call('bob', 'GET', `${V}/workspaces/${ws}/audit`)).s === 403);
const key2 = (await env.DB.prepare('SELECT content_key FROM dashboard WHERE id = ?1').bind(dId).first()).content_key;
check('editor deletes dashboard', (await call('bob', 'DELETE', `${D}/${dId}`)).s === 200);
check('delete also removes R2 content', !(await env.BLOBS.get(key2)));

// ---- rate limits ----
let blocked = 0;
for (let i = 0; i < 12; i++) if ((await call(null, 'POST', V + '/auth/sign-in/email', { email: 'alice@example.com', password: 'wrong-password-' + i }, '203.0.113.7')).s === 429) blocked++;
check('11th+ log-in attempt from one visitor is blocked', blocked === 2, blocked + ' blocked');
check('other visitors are not affected', (await call('alice2', 'POST', V + '/auth/sign-in/email', { email: 'alice@example.com', password: 'correct-horse-9' }, '198.51.100.9')).s === 200);

// ---- always-on parts and the switch ----
check('waitlist works', (await call(null, 'POST', '/api/waitlist', { email: 'wait@example.com', consent: true })).s === 200);
check('waitlist also on /api/v1', (await call(null, 'POST', V + '/waitlist', { email: 'wait1@example.com', consent: true })).s === 200);
check('unknown API gives 404', (await call(null, 'GET', '/api/nope')).s === 404);
env.PRO_ENABLED = 'false';
check('switch off: Pro API closed', (await call(null, 'POST', V + '/auth/sign-up/email', { name: 'Z', email: 'z@example.com', password: 'correct-horse-9' })).s === 404);
check('switch off: waitlist still works', (await call(null, 'POST', '/api/waitlist', { email: 'wait2@example.com', consent: true })).s === 200);
check('switch off: website still served', (await app.fetch(new Request('https://chartwright.de/'), env)).status === 200);

console.log(results.join('\n'));
const passed = results.filter((r) => r.startsWith('PASS')).length;
console.log(`\n${passed} of ${results.length} passed`);
await dispose();
process.exit(passed === results.length ? 0 : 1);
