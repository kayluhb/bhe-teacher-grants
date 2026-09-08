PRAGMA foreign_keys = OFF;

CREATE TABLE users_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'teacher' CHECK (role IN ('teacher', 'committee', 'admin', 'chair')),
  google_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO users_new (id, email, name, role, google_id, created_at, updated_at)
SELECT
  id,
  email,
  name,
  CASE role
    WHEN 'board' THEN 'committee'
    WHEN 'treasurer' THEN 'admin'
    ELSE role
  END,
  google_id,
  created_at,
  updated_at
FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

UPDATE users
SET role = 'chair', updated_at = datetime('now')
WHERE id = 'user_chairman' OR email = 'chair@bheeagles.com';

PRAGMA foreign_keys = ON;
