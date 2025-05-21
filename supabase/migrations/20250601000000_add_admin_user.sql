-- Add an admin user directly to the users table

-- Insert admin user if it doesn't already exist
INSERT INTO users (
  id,
  name,
  phone,
  pin,
  role,
  is_admin,
  is_active,
  created_at,
  updated_at,
  last_login
)
SELECT
  gen_random_uuid(),
  'Admin User',
  '+919436140918',
  '1234',
  'admin',
  true,
  true,
  now(),
  now(),
  null
WHERE NOT EXISTS (
  SELECT 1 FROM users 
  WHERE phone = '+919436140918'
); 