/** Version 1 of the Chartwright Pro API. Routes only translate HTTP to service calls; rules live in services/. */
import { Hono } from 'hono';
import { createAuth, signupMode } from '../lib/auth.js';
import { services } from '../services/index.js';
import { requireUser, requireRole } from '../services/access.js';
import { HttpError } from '../lib/errors.js';
import { DEFAULT_PLAN } from '../config.js';

const v1 = new Hono();

/**
 * Checks in front of Better Auth (the path is normalised, so a trailing slash or other spelling can't skip them):
 *  - sign-up: while SIGNUP_MODE is "waitlist", only people on the waitlist or with a pending invitation can create an account
 *  - delete account: the password is always required, however recently the person logged in
 */
v1.all('/auth/*', async (c) => {
  const path = new URL(c.req.url).pathname.toLowerCase().replace(/\/+$/, '');
  if (c.req.method === 'POST' && path.endsWith('/auth/sign-up/email') && signupMode(c.env) !== 'open') {
    const body = await c.req.raw.clone().json().catch(() => ({}));
    const email = String((body && body.email) || '').trim();
    if (email && !(await services(c.env).db.mayJoin(email))) {
      return c.json({ ok: false, code: 'SIGNUP_CLOSED', error: 'Chartwright Pro is open to people on the waitlist and invited colleagues for now. Join the waitlist and we’ll let you know.' }, 403);
    }
  }
  if (path.endsWith('/auth/delete-user')) {
    const body = await c.req.raw.clone().json().catch(() => ({}));
    if (!body || typeof body.password !== 'string' || !body.password) throw new HttpError(400, 'Enter your password to delete your account.');
  }
  return createAuth(c.env).handler(c.req.raw);
});

v1.get('/me', async (c) => {
  const user = await requireUser(c);
  const { db } = services(c.env);
  const fallback = c.env.DEFAULT_PLAN || DEFAULT_PLAN;
  const workspaces = (await db.workspacesForUser(user.id)).map((w) => ({ ...w, plan: w.plan || fallback }));
  return c.json({ ok: true, user: { id: user.id, name: user.name, email: user.email }, workspaces });
});

async function jsonBody(c) {
  try { return await c.req.json(); } catch { throw new HttpError(400, 'The request couldn’t be read.'); }
}

v1.get('/workspaces/:ws/dashboards', async (c) => {
  const s = services(c.env);
  const { role } = await requireRole(c, s.db, c.req.param('ws'), 'read');
  return c.json({ ok: true, role, dashboards: await s.dashboards.list(c.req.param('ws')) });
});

v1.post('/workspaces/:ws/dashboards', async (c) => {
  const s = services(c.env);
  const { user } = await requireRole(c, s.db, c.req.param('ws'), 'create');
  return c.json({ ok: true, ...(await s.dashboards.create(c.req.param('ws'), user.id, await jsonBody(c))) }, 201);
});

v1.get('/workspaces/:ws/dashboards/:id', async (c) => {
  const s = services(c.env);
  const { role } = await requireRole(c, s.db, c.req.param('ws'), 'read');
  return c.json({ ok: true, role, dashboard: await s.dashboards.get(c.req.param('ws'), c.req.param('id')) });
});

v1.put('/workspaces/:ws/dashboards/:id', async (c) => {
  const s = services(c.env);
  const { user } = await requireRole(c, s.db, c.req.param('ws'), 'update');
  return c.json({ ok: true, ...(await s.dashboards.update(c.req.param('ws'), user.id, c.req.param('id'), await jsonBody(c))) });
});

v1.delete('/workspaces/:ws/dashboards/:id', async (c) => {
  const s = services(c.env);
  const { user } = await requireRole(c, s.db, c.req.param('ws'), 'delete');
  await s.dashboards.remove(c.req.param('ws'), user.id, c.req.param('id'));
  return c.json({ ok: true });
});

v1.delete('/workspaces/:ws', async (c) => {
  const s = services(c.env);
  const { role } = await requireRole(c, s.db, c.req.param('ws'), null);
  if (role !== 'admin') throw new HttpError(403, 'Only admins can delete a workspace.');
  const body = await c.req.json().catch(() => ({}));
  await s.workspaces.removeByAdmin(c.req.param('ws'), body && body.confirm);
  return c.json({ ok: true });
});

v1.get('/workspaces/:ws/audit', async (c) => {
  const s = services(c.env);
  const { role } = await requireRole(c, s.db, c.req.param('ws'), null);
  if (role !== 'admin') throw new HttpError(403, 'Only admins can see the audit log.');
  return c.json({ ok: true, entries: await s.audit.list(c.req.param('ws')) });
});

export default v1;
