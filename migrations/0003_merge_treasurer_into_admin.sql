DELETE FROM sessions WHERE user_id = 'user_treasurer';
DELETE FROM users WHERE id = 'user_treasurer';
UPDATE users SET email = 'treasurer@bheeagles.com', name = 'PTA Treasurer' WHERE id = 'user_admin';
UPDATE users SET role = 'admin' WHERE role = 'treasurer';
