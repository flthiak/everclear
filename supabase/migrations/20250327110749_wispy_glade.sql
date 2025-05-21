/*
  # Fix Products Table Schema

  1. Changes
    - Drop existing products table
    - Create new products table with correct schema
    - Add proper indexes and triggers
    - Insert sample data
*/

-- Drop existing table and related objects
DROP TABLE IF EXISTS products CASCADE;
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- Create products table
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

-- Create policies for public access
CREATE POLICY "Enable read access for everyone" ON products
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for everyone" ON products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for everyone" ON products
  FOR UPDATE USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for everyone" ON products
  FOR DELETE USING (true);

-- Create indexes
CREATE INDEX idx_products_name ON products (name);
CREATE INDEX idx_products_type ON products (type);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
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