INSERT INTO users (id, email, name, role) VALUES
  ('user_admin', 'treasurer@bheeagles.com', 'PTA Treasurer', 'admin'),
  ('user_teacher', 'teacher@austinisd.org', 'Jordan Lee', 'teacher'),
  ('user_board', 'board@bheeagles.com', 'Alex Rivera', 'board'),
  ('user_committee', 'committee@bheeagles.com', 'Sam Patel', 'committee');

INSERT INTO school_years (id, label, starts_on, ends_on, is_default, sort_order)
VALUES ('2026-27', '2026-27', '2026-08-01', '2027-07-31', 1, 2026);

INSERT INTO grant_cycles (
  id, school_year_id, semester, name, budget_limit, max_grant_amount,
  starts_at, ends_at, is_active, vote_quorum
) VALUES
  (
    'cycle_fall_2026',
    '2026-27',
    'FALL',
    'Fall 2026-27 Teacher Grants',
    5000,
    500,
    '2026-08-15T00:00:00Z',
    '2026-10-15T23:59:59Z',
    1,
    3
  ),
  (
    'cycle_spring_2027',
    '2026-27',
    'SPRING',
    'Spring 2026-27 Teacher Grants',
    5000,
    500,
    '2027-01-10T00:00:00Z',
    '2027-03-15T23:59:59Z',
    0,
    3
  );
