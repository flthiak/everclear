-- Create a function for PIN-based authentication with the users table

-- Drop the function if it already exists to avoid conflicts
DROP FUNCTION IF EXISTS verify_user_pin_only(text);

-- Create the authentication function
CREATE OR REPLACE FUNCTION verify_user_pin_only(p_pin text)
RETURNS TABLE (
  id uuid,
  phone_number text,
  role_id text,
  name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return user data if PIN matches
  RETURN QUERY
  SELECT 
    u.id,
    u.phone_number,
    u.role_id,
    u.name
  FROM public.user_profile u
  WHERE 
    u.pin = p_pin
    AND u.is_active = true;

  -- If no rows returned, PIN was invalid
  IF NOT FOUND THEN
    RAISE DEBUG 'No user found with the provided PIN';
  END IF;
END;
$$;

-- Grant execute permission on the function to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION verify_user_pin_only(text) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_user_pin_only(text) TO anon; 