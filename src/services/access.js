/** Who is calling, and what may they do in a workspace? */
import { createAuth } from '../lib/auth.js';
import { HttpError } from '../lib/errors.js';
import { DASHBOARD_RIGHTS } from '../config.js';

export async function requireUser(c) {
  const session = await createAuth(c.env).api.getSession({ headers: c.req.raw.headers });
  if (!session) throw new HttpError(401, 'Please log in.');
  return session.user;
}

/** Returns the caller's role in the workspace, or fails. Outsiders get "not found" so workspaces stay private. */
export async function requireRole(c, db, workspaceId, right) {
  const user = await requireUser(c);
  const role = await db.memberRole(workspaceId, user.id);
  if (!role) throw new HttpError(404, 'Workspace not found.');
  if (right && !(DASHBOARD_RIGHTS[role] || []).includes(right)) throw new HttpError(403, `Your role (${role}) can’t do this.`);
  return { user, role };
}
