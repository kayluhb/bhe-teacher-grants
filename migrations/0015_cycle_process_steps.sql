CREATE TABLE IF NOT EXISTS cycle_process_steps (
  cycle_id TEXT NOT NULL REFERENCES grant_cycles(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  done_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (cycle_id, step_id)
);

CREATE INDEX IF NOT EXISTS idx_cycle_process_steps_cycle ON cycle_process_steps(cycle_id);
