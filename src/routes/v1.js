/** Version 1 of the Chartwright Pro API. Routes only translate HTTP to service calls; rules live in services/. */
import { Hono } from 'hono';
import { createAuth } from '../lib/auth.js';
import { services } from '../services/index.js';
import { requireUser, requireRole } from '../services/access.js';
import { HttpError } from '../lib/errors.js';
import { DEFAULT_PLAN } from '../config.js';

const v1 = new Hono();

v1.all('/auth/*', (c) => createAuth(c.env).handler(c.req.raw));

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

v1.get('/workspaces/:ws/audit', async (c) => {
  const s = services(c.env);
  const { role } = await requireRole(c, s.db, c.req.param('ws'), null);
  if (role !== 'admin') throw new HttpError(403, 'Only admins can see the audit log.');
  return c.json({ ok: true, entries: await s.audit.list(c.req.param('ws')) });
});

export default v1;
