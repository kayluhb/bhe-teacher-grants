ALTER TABLE grant_cycles ADD COLUMN community_intro TEXT NOT NULL DEFAULT '';
ALTER TABLE grant_cycles ADD COLUMN community_published_at TEXT;
ALTER TABLE grants ADD COLUMN community_blurb TEXT;
