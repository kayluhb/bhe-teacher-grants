ALTER TABLE grant_cycles ADD COLUMN review_starts_at TEXT;
ALTER TABLE grant_cycles ADD COLUMN review_ends_at TEXT;
ALTER TABLE grant_cycles ADD COLUMN review_opened_notified_at TEXT;
ALTER TABLE grants ADD COLUMN chairman_notified_at TEXT;

UPDATE grant_cycles
SET
  review_starts_at = ends_at,
  review_ends_at = CASE
    WHEN id = 'cycle_fall_2026' THEN '2026-10-30T23:59:59Z'
    WHEN id = 'cycle_spring_2027' THEN '2027-03-29T23:59:59Z'
    ELSE ends_at
  END
WHERE review_starts_at IS NULL;

CREATE TABLE IF NOT EXISTS cycle_reviewers (
  id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL REFERENCES grant_cycles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seat TEXT NOT NULL CHECK (seat IN ('treasurer', 'principal', 'chairman', 'committee')),
  UNIQUE (cycle_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cycle_reviewers_cycle ON cycle_reviewers(cycle_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cycle_reviewers_one_treasurer
  ON cycle_reviewers(cycle_id) WHERE seat = 'treasurer';
CREATE UNIQUE INDEX IF NOT EXISTS idx_cycle_reviewers_one_principal
  ON cycle_reviewers(cycle_id) WHERE seat = 'principal';
CREATE UNIQUE INDEX IF NOT EXISTS idx_cycle_reviewers_one_chairman
  ON cycle_reviewers(cycle_id) WHERE seat = 'chairman';

CREATE TABLE IF NOT EXISTS cycle_review_reminders (
  cycle_id TEXT NOT NULL REFERENCES grant_cycles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  threshold TEXT NOT NULL CHECK (threshold IN ('3d', '1d')),
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (cycle_id, user_id, threshold)
);

INSERT INTO users (id, email, name, role) VALUES
  ('user_chairman', 'chair@bheeagles.com', 'Chris Hall', 'committee')
ON CONFLICT(email) DO UPDATE SET
  name = excluded.name,
  updated_at = datetime('now');

INSERT OR IGNORE INTO cycle_reviewers (id, cycle_id, user_id, seat) VALUES
  ('cr_fall_treasurer', 'cycle_fall_2026', 'user_admin', 'treasurer'),
  ('cr_fall_principal', 'cycle_fall_2026', 'user_principal', 'principal'),
  ('cr_fall_chairman', 'cycle_fall_2026', 'user_chairman', 'chairman'),
  ('cr_fall_committee', 'cycle_fall_2026', 'user_committee', 'committee'),
  ('cr_fall_teacher', 'cycle_fall_2026', 'user_teacher', 'committee');
