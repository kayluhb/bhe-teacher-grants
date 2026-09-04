-- Reviewer ballots are High / Medium / Low / Abstain instead of Approve / Reject / Abstain.
-- Existing Approve maps to High; Reject maps to Low; Abstain stays.

CREATE TABLE grant_votes_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  grant_id TEXT NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
  voter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('HIGH', 'MEDIUM', 'LOW', 'ABSTAIN')),
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (grant_id, voter_id)
);

INSERT INTO grant_votes_new (id, grant_id, voter_id, vote, comment, created_at, updated_at)
SELECT
  id,
  grant_id,
  voter_id,
  CASE vote
    WHEN 'APPROVE' THEN 'HIGH'
    WHEN 'REJECT' THEN 'LOW'
    ELSE vote
  END,
  comment,
  created_at,
  updated_at
FROM grant_votes;

DROP TABLE grant_votes;
ALTER TABLE grant_votes_new RENAME TO grant_votes;

CREATE INDEX IF NOT EXISTS idx_votes_grant ON grant_votes(grant_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON grant_votes(voter_id);
