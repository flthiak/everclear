-- This migration creates a function to update sales payment status
-- specifically to verify payments in the sales table

-- Create the function
CREATE OR REPLACE FUNCTION update_sales_payment_status(
  p_sale_id UUID,
  p_status TEXT DEFAULT 'paid',
  p_verified BOOLEAN DEFAULT TRUE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Run with privileges of function creator
SET search_path = public
AS $$
BEGIN
  -- Update the sale record
  UPDATE sales
  SET 
    status = p_status,
    verified = p_verified,
    payment_date = NOW(),
    updated_at = NOW()
  WHERE id = p_sale_id;
  
  -- Check if the update succeeded
  IF FOUND THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error updating sales record: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Grant execute permissions to anon and authenticated roles
GRANT EXECUTE ON FUNCTION update_sales_payment_status TO anon, authenticated;

-- Create a trigger function to log payment verifications
CREATE OR REPLACE FUNCTION log_payment_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only proceed if status changed to 'paid' or verified changed to TRUE
  IF (NEW.status = 'paid' AND OLD.status != 'paid') OR 
     (NEW.verified = TRUE AND OLD.verified != TRUE) THEN
    
    -- Insert a record in the payments table if it exists
    BEGIN
      INSERT INTO payments (
        sale_id,
        amount,
        payment_method,
        created_at,
        customer_id
      )
      VALUES (
        NEW.id,
        NEW.total_amount,
        NEW.payment_method,
        NOW(),
        NEW.customer_id
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error inserting payment record: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create a trigger to automatically log payment verifications
DROP TRIGGER IF EXISTS payment_verification_trigger ON sales;

CREATE TRIGGER payment_verification_trigger
AFTER UPDATE ON sales
FOR EACH ROW
EXECUTE FUNCTION log_payment_verification();

-- Function specifically to verify payments in the sales table
-- This ensures payments are properly marked as verified

-- Create the function
CREATE OR REPLACE FUNCTION verify_payment(sale_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log that we're trying to verify this payment
  RAISE NOTICE 'Verifying payment for sale ID: %', sale_id;
  
  -- Update the sales record
  UPDATE sales
  SET 
    status = 'paid',
    verified = TRUE,
    payment_date = NOW()
  WHERE id = sale_id;
  
  -- Check if the update was successful
  IF NOT FOUND THEN
    RAISE NOTICE 'No sale found with ID: %', sale_id;
    RETURN FALSE;
  END IF;
  
  -- Log success
  RAISE NOTICE 'Successfully verified payment for sale ID: %', sale_id;
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Log any errors
    RAISE NOTICE 'Error verifying payment for sale ID %: %', sale_id, SQLERRM;
    RETURN FALSE;
END;
$$;

-- Grant permission to execute this function
GRANT EXECUTE ON FUNCTION verify_payment TO authenticated;
GRANT EXECUTE ON FUNCTION verify_payment TO anon;

-- Also create a helper function for updating verify status directly
-- First drop the function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS update_sales_payment_status_direct(UUID, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION update_sales_payment_status_direct(
  p_sale_id UUID,
  p_status TEXT,
  p_verified BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the sales record
  UPDATE sales
  SET 
    status = p_status,
    verified = p_verified,
    payment_date = NOW()
  WHERE id = p_sale_id;
  
  -- Return TRUE if successful
  RETURN FOUND;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Grant permission to execute this function
GRANT EXECUTE ON FUNCTION update_sales_payment_status_direct TO authenticated;
GRANT EXECUTE ON FUNCTION update_sales_payment_status_direct TO anon;

-- Trigger function to handle payment verification
CREATE OR REPLACE FUNCTION handle_payment_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If a record was verified, update the sales_unified table if it exists
  IF NEW.verified = TRUE AND OLD.verified = FALSE THEN
    -- Insert a record in the payments table if it exists
    BEGIN
      INSERT INTO payments (
        sale_id,
        amount,
        payment_method,
        payment_date,
        status,
        customer_id
      ) VALUES (
        NEW.id,
        NEW.total_amount,
        NEW.payment_method,
        NEW.payment_date,
        'completed',
        NEW.customer_id
      );
    EXCEPTION
      WHEN undefined_table THEN
        -- Payments table doesn't exist, that's ok
        NULL;
      WHEN OTHERS THEN
        -- Log any other errors but don't fail the trigger
        RAISE NOTICE 'Error recording payment: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on the sales table
DROP TRIGGER IF EXISTS sales_payment_verification_trigger ON sales;
CREATE TRIGGER sales_payment_verification_trigger
AFTER UPDATE OF verified ON sales
FOR EACH ROW
WHEN (NEW.verified = TRUE AND OLD.verified = FALSE)
EXECUTE FUNCTION handle_payment_verification(); 