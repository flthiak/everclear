-- Function to force a payment to be verified
-- This uses a direct SQL update which ensures the verified field is set to TRUE

CREATE OR REPLACE FUNCTION force_verify_payment(
  sale_id UUID, 
  maintain_delivered_status BOOLEAN DEFAULT FALSE,
  set_verified BOOLEAN DEFAULT TRUE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_status TEXT;
  new_status TEXT := 'paid';
BEGIN
  -- Log that we're updating the sale status
  RAISE NOTICE 'Updating sale ID: % with set_verified=%', sale_id, set_verified;
  
  -- If maintain_delivered_status is true, we need to check the current status
  IF maintain_delivered_status THEN
    -- Get the current status
    SELECT status INTO current_status FROM sales WHERE id = sale_id;
    
    -- If current status is 'delivered', keep it as 'delivered'
    IF current_status = 'delivered' THEN
      new_status := 'delivered';
      RAISE NOTICE 'Maintaining delivered status for delivery item: %', sale_id;
    END IF;
  END IF;
  
  -- Execute a direct SQL update on the sales table
  EXECUTE 'UPDATE sales SET verified = $2, status = $3 WHERE id = $1' 
    USING sale_id, set_verified, new_status;
  
  -- Return success
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Log any errors
    RAISE NOTICE 'Error updating sale ID %: %', sale_id, SQLERRM;
    RETURN FALSE;
END;
$$;

-- Grant permission to execute this function to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION force_verify_payment(UUID, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION force_verify_payment(UUID, BOOLEAN, BOOLEAN) TO anon; 