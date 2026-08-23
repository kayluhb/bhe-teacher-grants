PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'teacher' CHECK (role IN ('teacher', 'board', 'committee', 'treasurer', 'admin')),
  google_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS school_years (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  starts_on TEXT NOT NULL,
  ends_on TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_school_years_label ON school_years(label);

CREATE TABLE IF NOT EXISTS grant_cycles (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  school_year_id TEXT NOT NULL REFERENCES school_years(id) ON DELETE RESTRICT,
  semester TEXT NOT NULL CHECK (semester IN ('FALL', 'SPRING')),
  name TEXT NOT NULL,
  budget_limit REAL NOT NULL DEFAULT 0.0,
  max_grant_amount REAL NOT NULL DEFAULT 500.0,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
  vote_quorum INTEGER NOT NULL DEFAULT 3,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (school_year_id, semester)
);

CREATE INDEX IF NOT EXISTS idx_cycles_school_year ON grant_cycles(school_year_id);
CREATE INDEX IF NOT EXISTS idx_cycles_active ON grant_cycles(is_active);

CREATE TABLE IF NOT EXISTS grants (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  cycle_id TEXT NOT NULL REFERENCES grant_cycles(id) ON DELETE RESTRICT,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  grade_level_subject TEXT NOT NULL,
  title TEXT NOT NULL,
  impact_statement TEXT NOT NULL,
  wishlist_url TEXT,
  wishlist_imported_at TEXT,
  requested_amount REAL NOT NULL DEFAULT 0.0,
  approved_amount REAL,
  actual_amount REAL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (
    status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PURCHASED', 'DELIVERED')
  ),
  rejection_reason TEXT,
  variance_note TEXT,
  vendor_name TEXT,
  tracking_number TEXT,
  receipt_r2_key TEXT,
  proof_of_delivery_r2_key TEXT,
  purchased_at TEXT,
  delivered_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS grant_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  grant_id TEXT NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
  item_description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL,
  total_price REAL GENERATED ALWAYS AS (quantity * unit_price) STORED,
  vendor_url TEXT,
  asin TEXT,
  source TEXT NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('WISHLIST', 'MANUAL')),
  quote_r2_key TEXT,
  is_ad_hoc INTEGER NOT NULL DEFAULT 0 CHECK (is_ad_hoc IN (0, 1)),
  item_status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (
    item_status IN ('REQUESTED', 'PURCHASED', 'SUBSTITUTED', 'UNAVAILABLE', 'CANCELLED')
  ),
  actual_description TEXT,
  actual_quantity INTEGER,
  actual_unit_price REAL,
  actual_total_price REAL GENERATED ALWAYS AS (
    CASE
      WHEN actual_quantity IS NULL OR actual_unit_price IS NULL THEN NULL
      ELSE actual_quantity * actual_unit_price
    END
  ) STORED,
  variance_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS grant_votes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  grant_id TEXT NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
  voter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('APPROVE', 'REJECT', 'ABSTAIN')),
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (grant_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_grant ON grant_votes(grant_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON grant_votes(voter_id);

CREATE TABLE IF NOT EXISTS grant_audit_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  grant_id TEXT NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL REFERENCES users(id),
  actor_role TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_grants_cycle_status ON grants(cycle_id, status);
CREATE INDEX IF NOT EXISTS idx_grants_teacher ON grants(teacher_id);
CREATE INDEX IF NOT EXISTS idx_items_grant ON grant_items(grant_id);
CREATE INDEX IF NOT EXISTS idx_audit_grant ON grant_audit_logs(grant_id);
