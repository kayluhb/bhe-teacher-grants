INSERT INTO users (id, email, name, role) VALUES
  ('user_principal', 'kathryn.achtermann@austinisd.org', 'Kati Achtermann', 'committee')
ON CONFLICT(email) DO UPDATE SET
  name = excluded.name,
  role = 'committee',
  updated_at = datetime('now');
