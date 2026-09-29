/** Audit log: who changed what in a workspace. */
import { LIMITS } from '../config.js';
export function createAuditService({ db }) {
  return {
    record: (workspaceId, userId, action, detail) => db.insertAudit({ workspaceId, userId, action, detail }),
    list: (workspaceId) => db.listAudit(workspaceId, LIMITS.auditPage),
  };
}
