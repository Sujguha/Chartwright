/** Builds the storage and service layers for one request. */
import { createDb } from '../storage/db.js';
import { createBlobs } from '../storage/blobs.js';
import { createAuditService } from './audit.js';
import { createDashboardService } from './dashboards.js';
import { createWorkspaceService } from './workspaces.js';

export function services(env) {
  const db = createDb(env.DB);
  const blobs = createBlobs(env.BLOBS);
  const audit = createAuditService({ db });
  return { db, blobs, audit, dashboards: createDashboardService({ db, blobs, audit }), workspaces: createWorkspaceService({ db, blobs }) };
}
