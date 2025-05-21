-- Create the users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text UNIQUE NOT NULL,
  pin text NOT NULL,
  role text NOT NULL,
  is_admin boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_login timestamptz
);

-- Enable row level security on the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies to control access to the users table
CREATE POLICY "Allow full access for authenticated users" 
  ON public.users FOR ALL TO authenticated
  USING (true) 
  WITH CHECK (true);

-- Create policy for anonymous access (for login)
CREATE POLICY "Allow anonymous users to select users" 
  ON public.users FOR SELECT TO anon
  USING (true);

-- Create a user_profile view for compatibility with auth functions
CREATE OR REPLACE VIEW public.user_profile AS
SELECT 
  id,
  name,
  phone as phone_number,
  role as role_id,
  is_admin,
  is_active,
  created_at,
  updated_at,
  last_login,
  pin
FROM public.users;

-- Grant access to the table and view
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;
GRANT SELECT ON public.user_profile TO authenticated;
GRANT SELECT ON public.user_profile TO anon; 