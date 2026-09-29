-- Waitlist table for chartwright.de. Run once in the D1 console (or: npx wrangler d1 execute chartwright-waitlist --remote --file=schema.sql)
CREATE TABLE IF NOT EXISTS waitlist (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT NOT NULL UNIQUE,
  plan        TEXT NOT NULL,
  tools       TEXT,
  consent_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
