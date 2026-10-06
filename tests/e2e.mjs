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
// A stand-in for Cloudflare's email binding: records every message instead of sending it.
const outbox = [];
const EMAIL = { async send(m) { outbox.push(m); return { messageId: 'test-' + outbox.length }; } };
const env = { ...raw, BETTER_AUTH_SECRET: 'test-secret-'.repeat(4), BASE_URL: 'https://chartwright.de', PRO_ENABLED: 'true',
  EMAIL, EMAIL_FROM: 'no-reply@chartwright.de', EMAIL_FROM_NAME: 'Chartwright', EMAIL_REPLY_TO: 'privacy@chartwright.de',
  AUTH_LIMITER: fakeLimiter(10), API_LIMITER: fakeLimiter(300), ASSETS: { fetch: async () => new Response('asset') } };
const mailTo = (email) => outbox.filter((m) => m.to === email);
const lastMail = (email) => mailTo(email).at(-1);
const linkIn = (m, kind) => { const x = m && m.text.match(new RegExp('https://chartwright\\.de/pro/#/' + kind + '/([^\\s]+)')); return x ? decodeURIComponent(x[1]) : null; };

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

// ---- accounts and email confirmation ----
const signUp = (who, name) => call(who, 'POST', V + '/auth/sign-up/email', { name: name || who[0].toUpperCase() + who.slice(1), email: who + '@example.com', password: 'correct-horse-9' });
const su = await signUp('alice');
check('sign-up alice', su.s === 200);
check('sign-up does not log in before the email is confirmed', (await call('alice', 'GET', V + '/me')).s === 401);
const welcome = lastMail('alice@example.com');
check('sign-up sends a confirmation email', !!welcome && /Confirm your email/.test(welcome.subject) && !!linkIn(welcome, 'verify'), welcome && welcome.subject);
check('email comes from no-reply@chartwright.de, replies go to privacy@', welcome && welcome.from.email === 'no-reply@chartwright.de' && welcome.from.name === 'Chartwright' && welcome.replyTo === 'privacy@chartwright.de');
check('email has HTML and plain text, and no outside images', welcome && welcome.html.includes('<html') && welcome.text.includes(linkIn(welcome, 'verify')) && !/<img|src=["']?http/i.test(welcome.html));
const before = mailTo('alice@example.com').length;
const unverified = await call('tmp', 'POST', V + '/auth/sign-in/email', { email: 'alice@example.com', password: 'correct-horse-9' });
check('log-in before confirming is refused', unverified.s === 403 && unverified.d.code === 'EMAIL_NOT_VERIFIED', unverified.s + ' ' + (unverified.d && unverified.d.code));
check('…and sends a fresh confirmation link', mailTo('alice@example.com').length === before + 1);
check('wrong confirmation link is rejected', (await call('tmp', 'GET', V + '/auth/verify-email?token=not-a-real-token')).s >= 400);
check('confirmation link confirms and logs in', (await call('alice', 'GET', V + '/auth/verify-email?token=' + encodeURIComponent(linkIn(welcome, 'verify')))).s === 200
  && (await call('alice', 'GET', V + '/me')).s === 200);
for (const who of ['bob', 'carol', 'dave']) {
  const r = await signUp(who);
  const ok = r.s === 200 && (await call(who, 'GET', V + '/auth/verify-email?token=' + encodeURIComponent(linkIn(lastMail(who + '@example.com'), 'verify')))).s === 200;
  check('sign-up and confirm ' + who, ok);
}
const again = await call(null, 'POST', V + '/auth/sign-up/email', { name: 'Mallory', email: 'alice@example.com', password: 'another-pass-99' });
check('signing up with a known email looks like a normal sign-up', again.s === 200 && again.d.token === null, again.s);
check('…and the owner gets an “already have an account” email', /already have a Chartwright account/.test(lastMail('alice@example.com').subject));
check('…and the old password still works', (await call('alice', 'POST', V + '/auth/sign-in/email', { email: 'alice@example.com', password: 'correct-horse-9' })).s === 200);
const n0 = outbox.length;
check('resending a confirmation to an unknown email gives the same answer', (await call(null, 'POST', V + '/auth/send-verification-email', { email: 'nobody@example.com' })).s === 200 && outbox.length === n0);
await signUp('eve', '<b>Eve</b>');
check('names are escaped in emails', lastMail('eve@example.com').html.includes('&lt;b&gt;Eve&lt;/b&gt;') && !lastMail('eve@example.com').html.includes('<b>Eve</b>'));
check('short password rejected', (await call(null, 'POST', V + '/auth/sign-up/email', { name: 'X', email: 'x@example.com', password: 'short' })).s >= 400);
check('wrong password rejected', (await call('tmp', 'POST', V + '/auth/sign-in/email', { email: 'alice@example.com', password: 'wrong-password-1' })).s === 401);
check('old unversioned address is gone', (await call('alice', 'GET', '/api/me')).s === 404);

// ---- workspace, roles, invitations ----
const org = await call('alice', 'POST', V + '/auth/organization/create', { name: 'Orbit Delivery', slug: 'orbit-delivery' });
check('alice creates workspace', org.s === 200 && !!org.d.id);
const ws = org.d.id;
const me0 = await call('alice', 'GET', V + '/me');
check('alice is admin', me0.d.workspaces[0].role === 'admin');
check('new workspace starts on Pro', me0.d.workspaces[0].plan === 'pro');

// ---- Pro plan: one admin, everyone else is a viewer ----
check('Pro: inviting an editor is refused', (await call('alice', 'POST', V + '/auth/organization/invite-member', { email: 'ed@example.com', role: 'editor', organizationId: ws })).s === 403);
check('Pro: inviting an admin is refused', (await call('alice', 'POST', V + '/auth/organization/invite-member', { email: 'ad@example.com', role: 'admin', organizationId: ws })).s === 403);
const proInv = await call('alice', 'POST', V + '/auth/organization/invite-member', { email: 'dave@example.com', role: 'viewer', organizationId: ws });
check('Pro: inviting a viewer works', proInv.s === 200);
const invMail = lastMail('dave@example.com');
check('invitation email sent with a link to the invitation', !!invMail && /invited you to Orbit Delivery/.test(invMail.subject) && linkIn(invMail, 'invite') === proInv.d.id, invMail && invMail.subject);
const daveInv = await call('dave', 'GET', V + '/auth/organization/list-user-invitations');
check('pending invitation listed on the invitee’s home page', daveInv.s === 200 && daveInv.d.some((i) => i.id === proInv.d.id));
check('admin can send the invitation again', (await call('alice', 'POST', V + '/auth/organization/invite-member', { email: 'dave@example.com', role: 'viewer', organizationId: ws, resend: true })).s === 200
  && mailTo('dave@example.com').filter((m) => /invited you/.test(m.subject)).length === 2);
check('Pro: dave joins as viewer', (await call('dave', 'POST', V + '/auth/organization/accept-invitation', { invitationId: proInv.d.id })).s === 200);
const daveMember = (await env.DB.prepare('SELECT id FROM member WHERE organizationId=?1 AND userId=(SELECT id FROM user WHERE email=?2)').bind(ws, 'dave@example.com').first()).id;
check('Pro: promoting a viewer to editor is refused', (await call('alice', 'POST', V + '/auth/organization/update-member-role', { memberId: daveMember, role: 'editor', organizationId: ws })).s === 403);
const aliceMember = (await env.DB.prepare('SELECT id FROM member WHERE organizationId=?1 AND userId=(SELECT id FROM user WHERE email=?2)').bind(ws, 'alice@example.com').first()).id;
const demote = await call('alice', 'POST', V + '/auth/organization/update-member-role', { memberId: aliceMember, role: 'viewer', organizationId: ws });
const aliceRole = (await env.DB.prepare('SELECT role FROM member WHERE id=?1').bind(aliceMember).first()).role;
check('Pro: the admin cannot be demoted', demote.s >= 400 && aliceRole === 'admin', demote.s + ' ' + JSON.stringify(demote.d) + ' role=' + aliceRole);
check('Pro: viewer cannot create dashboards', (await call('dave', 'POST', `${V}/workspaces/${ws}/dashboards`, { name: 'X', config: { app: 'chartwright', kind: 'dashboard' } })).s === 403);
check('Pro: admin removes the viewer', (await call('alice', 'POST', V + '/auth/organization/remove-member', { memberIdOrEmail: daveMember, organizationId: ws })).s === 200);

// ---- switch this workspace to Enterprise for the team-role tests below ----
await env.DB.prepare("INSERT INTO workspace_plan (workspace_id, plan, updated_at) VALUES (?1, 'enterprise', ?2)").bind(ws, new Date().toISOString()).run();
check('workspace shows Enterprise after upgrade', (await call('alice', 'GET', V + '/me')).d.workspaces[0].plan === 'enterprise');
const invB = await call('alice', 'POST', V + '/auth/organization/invite-member', { email: 'bob@example.com', role: 'editor', organizationId: ws });
const invC = await call('alice', 'POST', V + '/auth/organization/invite-member', { email: 'carol@example.com', role: 'viewer', organizationId: ws });
check('invites sent', invB.s === 200 && invC.s === 200);
check('bob accepts', (await call('bob', 'POST', V + '/auth/organization/accept-invitation', { invitationId: invB.d.id })).s === 200);
check('carol accepts', (await call('carol', 'POST', V + '/auth/organization/accept-invitation', { invitationId: invC.d.id })).s === 200);
check('someone else cannot use bob’s invitation', (await call('dave', 'POST', V + '/auth/organization/accept-invitation', { invitationId: invB.d.id })).s >= 400);
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
check('outsider (removed member) gets not found', (await call('dave', 'GET', `${D}/${dId}`)).s === 404);
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

// ---- password reset ----
const n1 = outbox.length;
const unknownReset = await call(null, 'POST', V + '/auth/request-password-reset', { email: 'nobody@example.com' });
check('reset for an unknown email gives the normal answer and sends nothing', unknownReset.s === 200 && outbox.length === n1);
await call('dave2', 'POST', V + '/auth/sign-in/email', { email: 'dave@example.com', password: 'correct-horse-9' });   // a second device
check('reset for a known email', (await call(null, 'POST', V + '/auth/request-password-reset', { email: 'dave@example.com' })).s === 200);
const resetMail = lastMail('dave@example.com');
const resetToken = linkIn(resetMail, 'reset');
check('reset email sent with a link', /Reset your Chartwright password/.test(resetMail.subject) && !!resetToken);
check('wrong reset link is rejected', (await call(null, 'POST', V + '/auth/reset-password', { newPassword: 'brand-new-pass-1', token: 'wrong-token' })).s >= 400);
check('new password must be at least 10 characters', (await call(null, 'POST', V + '/auth/reset-password', { newPassword: 'short', token: resetToken })).s >= 400);
check('reset link sets the new password', (await call(null, 'POST', V + '/auth/reset-password', { newPassword: 'brand-new-pass-1', token: resetToken })).s === 200);
check('reset link works only once', (await call(null, 'POST', V + '/auth/reset-password', { newPassword: 'another-pass-22', token: resetToken })).s >= 400);
check('reset logs out other devices', (await call('dave2', 'GET', V + '/me')).s === 401);
check('old password no longer works', (await call('tmp', 'POST', V + '/auth/sign-in/email', { email: 'dave@example.com', password: 'correct-horse-9' })).s === 401);
check('new password works', (await call('dave', 'POST', V + '/auth/sign-in/email', { email: 'dave@example.com', password: 'brand-new-pass-1' })).s === 200);

// ---- when emails can't be sent ----
const savedEmail = env.EMAIL;
env.EMAIL = { async send() { throw new Error('provider down'); } };
check('sign-up still completes when the email fails', (await call(null, 'POST', V + '/auth/sign-up/email', { name: 'Fay', email: 'fay@example.com', password: 'correct-horse-9' })).s === 200);
const failedResend = await call(null, 'POST', V + '/auth/send-verification-email', { email: 'fay@example.com' });
check('“Send the email again” shows a clear message when the email fails', failedResend.s === 502 && /couldn’t be sent/.test(failedResend.d.message), failedResend.s + ' ' + JSON.stringify(failedResend.d));
const invNoMail = await call('alice', 'POST', V + '/auth/organization/invite-member', { email: 'gus@example.com', role: 'viewer', organizationId: ws });
check('invitation is still created when its email fails (link can be copied)', invNoMail.s === 200 && !!invNoMail.d.id);
check('reset gives the normal answer even when the email fails', (await call(null, 'POST', V + '/auth/request-password-reset', { email: 'alice@example.com' })).s === 200);
env.EMAIL = savedEmail;

// ---- rate limits ----
let blocked = 0;
for (let i = 0; i < 12; i++) if ((await call(null, 'POST', V + '/auth/sign-in/email', { email: 'alice@example.com', password: 'wrong-password-' + i }, '203.0.113.7')).s === 429) blocked++;
check('11th+ log-in attempt from one visitor is blocked', blocked === 2, blocked + ' blocked');
let resendBlocked = 0;
for (let i = 0; i < 12; i++) if ((await call(null, 'POST', V + '/auth/send-verification-email', { email: 'eve@example.com' }, '203.0.113.8')).s === 429) resendBlocked++;
check('resending confirmation emails is rate limited', resendBlocked === 2, resendBlocked + ' blocked');
let resetBlocked = 0;
for (let i = 0; i < 12; i++) if ((await call(null, 'POST', V + '/auth/request-password-reset', { email: 'eve@example.com' }, '203.0.113.9')).s === 429) resetBlocked++;
check('password reset requests are rate limited', resetBlocked === 2, resetBlocked + ' blocked');
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
