/*
  # Fix Products Table Schema

  1. Changes
    - Drop and recreate products table with correct schema
    - Add proper indexes and RLS policies
    - Add sample data
*/

-- Drop existing products table
DROP TABLE IF EXISTS products CASCADE;

-- Create products table with correct schema
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  factory_price numeric NOT NULL DEFAULT 0,
  customer_price numeric NOT NULL DEFAULT 0,
  delivery_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policies for products
CREATE POLICY "Enable read access for all users" ON products
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON products
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON products
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON products
  FOR DELETE TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX idx_products_name ON products (name);
CREATE INDEX idx_products_type ON products (type);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample products data
INSERT INTO products (name, type, factory_price, customer_price, delivery_price)
VALUES
  ('250ml Bottle', 'bottle', 8.00, 10.00, 12.00),
  ('500ml Bottle', 'bottle', 12.00, 15.00, 18.00),
  ('1000ml Bottle', 'bottle', 16.00, 20.00, 24.00),
  ('250ml Label', 'label', 0.35, 0.50, 0.60),
  ('500ml Label', 'label', 0.45, 0.60, 0.75),
  ('1000ml Label', 'label', 0.55, 0.70, 0.85),
  ('Bottle Cap', 'cap', 0.25, 0.35, 0.40),
  ('Shrink Wrap', 'packaging', 15.00, 18.00, 20.00),
  ('Box (24 bottles)', 'packaging', 5.00, 6.00, 7.00)
ON CONFLICT DO NOTHING;