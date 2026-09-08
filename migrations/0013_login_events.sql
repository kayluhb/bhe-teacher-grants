CREATE TABLE IF NOT EXISTS login_events (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('otp_sent', 'otp_failed', 'otp_success', 'otp_locked')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_login_events_email_created ON login_events(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_events_user_created ON login_events(user_id, created_at DESC);

ALTER TABLE users ADD COLUMN last_login_at TEXT;
