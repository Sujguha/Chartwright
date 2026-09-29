-- Chartwright Pro: shared dashboards and audit log (auth tables come from 0001_auth.sql).
-- The dashboard table is replaced in 0003_dashboard_r2.sql.
CREATE TABLE IF NOT EXISTS dashboard (
  id            TEXT PRIMARY KEY,
  workspace_id  TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  config        TEXT NOT NULL,
  created_by    TEXT REFERENCES user(id) ON DELETE SET NULL,
  updated_by    TEXT REFERENCES user(id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_dashboard_ws ON dashboard(workspace_id, updated_at);
CREATE TABLE IF NOT EXISTS audit_log (
  id            TEXT PRIMARY KEY,
  workspace_id  TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  user_id       TEXT REFERENCES user(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  detail        TEXT,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_ws ON audit_log(workspace_id, created_at);
