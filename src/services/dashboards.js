/**
 * Business rules for shared dashboards. Names and permissions live in D1, contents in R2.
 * Every write stores the new content first and only then updates the database, so a failure never leaves
 * a dashboard pointing at missing content.
 */
import { HttpError } from '../lib/errors.js';
import { LIMITS } from '../config.js';

function validate(body) {
  if (!body || typeof body !== 'object') throw new HttpError(400, 'Missing dashboard.');
  const name = String(body.name || '').trim();
  if (!name || name.length > LIMITS.dashboardName) throw new HttpError(400, `Give the dashboard a name (up to ${LIMITS.dashboardName} characters).`);
  const cfg = body.config;
  if (!cfg || cfg.app !== 'chartwright' || cfg.kind !== 'dashboard') throw new HttpError(400, 'The dashboard data isn’t in Chartwright’s format.');
  const text = JSON.stringify(cfg);
  const sizeBytes = new TextEncoder().encode(text).length;
  if (sizeBytes > LIMITS.dashboardBytes) throw new HttpError(413, `This dashboard is too large (limit ${Math.round(LIMITS.dashboardBytes / 1048576)} MB). Filter or trim the data first.`);
  return { name, text, sizeBytes };
}

export function createDashboardService({ db, blobs, audit }) {
  return {
    list: (workspaceId) => db.listDashboards(workspaceId),

    async get(workspaceId, id) {
      const meta = await db.getDashboard(workspaceId, id);
      if (!meta) throw new HttpError(404, 'Dashboard not found.');
      const text = await blobs.getText(meta.content_key);
      if (text === null) throw new HttpError(500, 'The dashboard’s content is missing. Please contact support.');
      return { id: meta.id, name: meta.name, version: meta.version, updated_at: meta.updated_at, config: JSON.parse(text) };
    },

    async create(workspaceId, userId, body) {
      const { name, text, sizeBytes } = validate(body);
      const id = crypto.randomUUID(), now = new Date().toISOString(), contentKey = blobs.key(workspaceId, id, 1);
      await blobs.put(contentKey, text);
      try {
        await db.insertDashboard({ id, workspaceId, name, contentKey, sizeBytes, userId, now });
      } catch (e) {
        await blobs.remove(contentKey);
        throw e;
      }
      await audit.record(workspaceId, userId, 'dashboard.create', { id, name });
      return { id, version: 1 };
    },

    async update(workspaceId, userId, id, body) {
      const { name, text, sizeBytes } = validate(body);
      const current = await db.getDashboard(workspaceId, id);
      if (!current) throw new HttpError(404, 'Dashboard not found.');
      // Optional safety check: the client says which version it edited, so two people can't silently overwrite each other.
      if (body.version !== undefined && Number(body.version) !== current.version) {
        throw new HttpError(409, 'Someone else changed this dashboard in the meantime. Reload it and try again.');
      }
      const nextVersion = current.version + 1, contentKey = blobs.key(workspaceId, id, nextVersion);
      await blobs.put(contentKey, text);
      const ok = await db.updateDashboard({ id, workspaceId, name, contentKey, sizeBytes, userId, now: new Date().toISOString(), expectedVersion: current.version });
      if (!ok) {
        await blobs.remove(contentKey);
        throw new HttpError(409, 'Someone else changed this dashboard in the meantime. Reload it and try again.');
      }
      await blobs.remove(current.content_key);
      await audit.record(workspaceId, userId, 'dashboard.update', { id, name, version: nextVersion });
      return { id, version: nextVersion };
    },

    async remove(workspaceId, userId, id) {
      const current = await db.getDashboard(workspaceId, id);
      if (!current || !(await db.deleteDashboard(workspaceId, id))) throw new HttpError(404, 'Dashboard not found.');
      await blobs.remove(current.content_key);
      await audit.record(workspaceId, userId, 'dashboard.delete', { id, name: current.name });
    },
  };
}
