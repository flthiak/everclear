-- Add a regular user to the users table

-- Insert regular user if it doesn't already exist
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
  'Regular User',
  '+919876543210',
  '5678',
  'user',
  false,
  true,
  now(),
  now(),
  null
WHERE NOT EXISTS (
  SELECT 1 FROM users 
  WHERE phone = '+919876543210'
); 