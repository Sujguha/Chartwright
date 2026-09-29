/**
 * Data-access layer for D1. All SQL lives here, so the database can be swapped
 * (for example to Postgres) without touching routes or business rules.
 */
export function createDb(DB) {
  return {
    async memberRole(workspaceId, userId) {
      const row = await DB.prepare('SELECT role FROM member WHERE organizationId = ?1 AND userId = ?2').bind(workspaceId, userId).first();
      return row ? String(row.role).split(',')[0].trim() : null;
    },
    async workspacesForUser(userId) {
      const { results } = await DB.prepare(
        'SELECT o.id, o.name, o.slug, m.role FROM member m JOIN organization o ON o.id = m.organizationId WHERE m.userId = ?1 ORDER BY o.name'
      ).bind(userId).all();
      return results;
    },
    async listDashboards(workspaceId) {
      const { results } = await DB.prepare(
        `SELECT d.id, d.name, d.size_bytes, d.version, d.updated_at, u.name AS updated_by
         FROM dashboard d LEFT JOIN user u ON u.id = d.updated_by WHERE d.workspace_id = ?1 ORDER BY d.updated_at DESC`
      ).bind(workspaceId).all();
      return results;
    },
    async getDashboard(workspaceId, id) {
      return DB.prepare('SELECT id, workspace_id, name, content_key, size_bytes, version, updated_at FROM dashboard WHERE id = ?1 AND workspace_id = ?2')
        .bind(id, workspaceId).first();
    },
    async insertDashboard(d) {
      await DB.prepare(
        `INSERT INTO dashboard (id, workspace_id, name, content_key, size_bytes, version, created_by, updated_by, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?6, ?7, ?7)`
      ).bind(d.id, d.workspaceId, d.name, d.contentKey, d.sizeBytes, d.userId, d.now).run();
    },
    async updateDashboard(d) {
      const r = await DB.prepare(
        `UPDATE dashboard SET name = ?1, content_key = ?2, size_bytes = ?3, version = version + 1, updated_by = ?4, updated_at = ?5
         WHERE id = ?6 AND workspace_id = ?7 AND version = ?8`
      ).bind(d.name, d.contentKey, d.sizeBytes, d.userId, d.now, d.id, d.workspaceId, d.expectedVersion).run();
      return r.meta.changes > 0;
    },
    async deleteDashboard(workspaceId, id) {
      const r = await DB.prepare('DELETE FROM dashboard WHERE id = ?1 AND workspace_id = ?2').bind(id, workspaceId).run();
      return r.meta.changes > 0;
    },
    async insertAudit(e) {
      await DB.prepare('INSERT INTO audit_log (id, workspace_id, user_id, action, detail, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
        .bind(crypto.randomUUID(), e.workspaceId, e.userId, e.action, e.detail ? JSON.stringify(e.detail).slice(0, 2000) : null, new Date().toISOString()).run();
    },
    async listAudit(workspaceId, limit) {
      const { results } = await DB.prepare(
        `SELECT a.created_at, a.action, a.detail, u.name AS user FROM audit_log a LEFT JOIN user u ON u.id = a.user_id
         WHERE a.workspace_id = ?1 ORDER BY a.created_at DESC LIMIT ?2`
      ).bind(workspaceId, limit).all();
      return results;
    },
  };
}
