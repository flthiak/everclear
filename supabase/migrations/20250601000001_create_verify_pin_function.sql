-- Create the verify_user_pin_only function if it doesn't already exist
-- This function is used for PIN-based authentication

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
    u.raw_user_meta_data->>'role_id' as role_id,
    u.raw_user_meta_data->>'name' as name
  FROM auth.users u
  WHERE 
    u.raw_user_meta_data->>'pin' = p_pin
    AND u.role = 'authenticated';

  -- If no rows returned, PIN was invalid
  IF NOT FOUND THEN
    RAISE DEBUG 'No user found with the provided PIN';
  END IF;
END;
$$;

-- Grant execute permission on the function to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION verify_user_pin_only(text) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_user_pin_only(text) TO anon; 