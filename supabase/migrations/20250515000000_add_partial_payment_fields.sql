-- Create the payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add all needed columns for payment tracking
ALTER TABLE payments ADD COLUMN IF NOT EXISTS sale_id uuid REFERENCES sales(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount numeric DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'Cash';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_date timestamp with time zone DEFAULT now();
ALTER TABLE payments ADD COLUMN IF NOT EXISTS is_partial boolean DEFAULT false;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS remaining_balance numeric DEFAULT 0;

-- Add comments explaining column purposes
COMMENT ON COLUMN payments.sale_id IS 'Reference to the sale this payment is for';
COMMENT ON COLUMN payments.customer_id IS 'Reference to the customer who made the payment';
COMMENT ON COLUMN payments.amount IS 'Amount paid in this transaction';
COMMENT ON COLUMN payments.payment_method IS 'Method of payment (Cash, Credit, UPI, etc.)';
COMMENT ON COLUMN payments.payment_date IS 'Date and time when payment was made';
COMMENT ON COLUMN payments.is_partial IS 'Indicates if this is a partial payment (true) or full payment (false)';
COMMENT ON COLUMN payments.remaining_balance IS 'Amount still outstanding after this payment is applied';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS payments_sale_id_idx ON payments(sale_id);
CREATE INDEX IF NOT EXISTS payments_customer_id_idx ON payments(customer_id);
CREATE INDEX IF NOT EXISTS payments_payment_date_idx ON payments(payment_date);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payments table
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 