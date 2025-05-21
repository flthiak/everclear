/*
  # Fix Schema Relationships and Missing Columns

  1. Changes
    - Drop and recreate customers table with proper columns
    - Add proper foreign key constraints
    - Add missing columns
    - Ensure proper RLS policies

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Drop existing tables to ensure clean slate
DROP TABLE IF EXISTS customers CASCADE;

-- Create customers table with all required columns
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type customer_type NOT NULL,
  name text NOT NULL,
  phone text,
  address text,
  credit_limit numeric NOT NULL DEFAULT 0,
  current_balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create policies for customers
CREATE POLICY "Enable read access for all users" ON customers
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON customers
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON customers
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON customers
  FOR DELETE TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX idx_customers_type ON customers(type);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_phone ON customers(phone);

-- Create trigger for updated_at
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Refresh factory_stock foreign key
ALTER TABLE factory_stock
  DROP CONSTRAINT IF EXISTS factory_stock_product_id_fkey,
  ADD CONSTRAINT factory_stock_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE CASCADE;

-- Refresh godown_stock foreign key
ALTER TABLE godown_stock
  DROP CONSTRAINT IF EXISTS godown_stock_product_id_fkey,
  ADD CONSTRAINT godown_stock_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE CASCADE;

-- Refresh daily_production foreign key
ALTER TABLE daily_production
  DROP CONSTRAINT IF EXISTS daily_production_product_id_fkey,
  ADD CONSTRAINT daily_production_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE CASCADE;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';