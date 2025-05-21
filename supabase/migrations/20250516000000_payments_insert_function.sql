-- Create a function to safely insert payment records
CREATE OR REPLACE FUNCTION insert_payment(
  p_sale_id text,
  p_customer_id text,
  p_amount numeric,
  p_payment_method text DEFAULT 'Cash',
  p_payment_date timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inserted_id uuid;
BEGIN
  -- First check if payments table exists
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
    -- Create the table if it doesn't exist
    CREATE TABLE payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL,
      sale_id text,
      customer_id text,
      amount numeric DEFAULT 0,
      payment_method text DEFAULT 'Cash',
      payment_date timestamptz DEFAULT now()
    );
  END IF;

  -- Insert the payment record
  INSERT INTO payments (
    sale_id,
    customer_id,
    amount,
    payment_method,
    payment_date
  ) VALUES (
    p_sale_id,
    p_customer_id,
    p_amount,
    p_payment_method,
    p_payment_date
  ) RETURNING id INTO inserted_id;

  RETURN inserted_id;
END;
$$; 