ALTER TABLE grants ADD COLUMN chair_digest_notified_at TEXT;
ALTER TABLE grant_cycles ADD COLUMN submission_closed_notified_at TEXT;
ALTER TABLE grant_cycles ADD COLUMN review_closed_notified_at TEXT;

UPDATE grants
SET chair_digest_notified_at = datetime('now')
WHERE status = 'PENDING' AND chair_digest_notified_at IS NULL;

UPDATE grant_cycles
SET submission_closed_notified_at = datetime('now')
WHERE ends_at <= datetime('now') AND submission_closed_notified_at IS NULL;

UPDATE grant_cycles
SET review_closed_notified_at = datetime('now')
WHERE review_ends_at IS NOT NULL
  AND review_ends_at <= datetime('now')
  AND review_closed_notified_at IS NULL;

CREATE TABLE IF NOT EXISTS cycle_chair_submission_reminders (
  cycle_id TEXT NOT NULL REFERENCES grant_cycles(id) ON DELETE CASCADE,
  threshold TEXT NOT NULL CHECK (threshold IN ('3d', '1d')),
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (cycle_id, threshold)
);
