CREATE TABLE login_otps (
  email TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  sent_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  send_count INTEGER NOT NULL DEFAULT 1,
  window_started_at INTEGER NOT NULL
);

DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE role = 'board' OR id = 'user_board');
DELETE FROM grant_votes WHERE voter_id IN (SELECT id FROM users WHERE role = 'board' OR id = 'user_board');
DELETE FROM grant_audit_logs WHERE actor_id IN (SELECT id FROM users WHERE role = 'board' OR id = 'user_board');
UPDATE users SET role = 'committee' WHERE role = 'board' AND id != 'user_board';
DELETE FROM users WHERE id = 'user_board';
