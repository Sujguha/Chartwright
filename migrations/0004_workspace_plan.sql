-- Plan per workspace. "pro": one admin, everyone else is a viewer. "enterprise": all roles.
-- Workspaces without a row use the default plan (DEFAULT_PLAN, normally "pro").
CREATE TABLE IF NOT EXISTS workspace_plan (
  workspace_id  TEXT PRIMARY KEY REFERENCES organization(id) ON DELETE CASCADE,
  plan          TEXT NOT NULL CHECK (plan IN ('pro', 'enterprise')),
  updated_at    TEXT NOT NULL
);
