-- Operator-managed grants; verified auth identity activates access. Not exposed by any browser resource API.
CREATE TABLE platform_admins (
  email TEXT PRIMARY KEY CHECK(email = lower(trim(email))),
  granted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
