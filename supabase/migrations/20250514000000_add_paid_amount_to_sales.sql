-- Add paid_amount column to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS paid_amount numeric DEFAULT 0;

-- Update existing sales with paid_amount = total_amount where status is 'paid'
UPDATE sales SET paid_amount = total_amount WHERE status = 'paid';

-- Create a function to update sales status based on paid_amount
CREATE OR REPLACE FUNCTION update_sales_status_based_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- If paid_amount equals or exceeds total_amount, mark as paid
    IF NEW.paid_amount >= NEW.total_amount THEN
        NEW.status := 'paid';
        NEW.verified := TRUE;
    -- If paid_amount is greater than 0 but less than total_amount, mark as pending
    ELSIF NEW.paid_amount > 0 THEN
        NEW.status := 'pending';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update status based on paid_amount
CREATE TRIGGER update_sales_status_on_payment
    BEFORE UPDATE OF paid_amount ON sales
    FOR EACH ROW
    WHEN (OLD.paid_amount IS DISTINCT FROM NEW.paid_amount)
    EXECUTE FUNCTION update_sales_status_based_on_payment();

-- Comment explaining this migration
COMMENT ON COLUMN sales.paid_amount IS 'The amount that has been paid for this sale, supports partial payments'; 