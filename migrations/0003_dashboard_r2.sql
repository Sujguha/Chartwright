-- Dashboard contents move to R2 file storage; D1 keeps names, permissions and versions.
-- Safe to run: Pro was switched off, so the old dashboard table holds no data.
DROP TABLE IF EXISTS dashboard;
CREATE TABLE dashboard (
  id            TEXT PRIMARY KEY,
  workspace_id  TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  content_key   TEXT NOT NULL,
  size_bytes    INTEGER NOT NULL,
  version       INTEGER NOT NULL DEFAULT 1,
  created_by    TEXT REFERENCES user(id) ON DELETE SET NULL,
  updated_by    TEXT REFERENCES user(id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_dashboard_ws ON dashboard(workspace_id, updated_at);
