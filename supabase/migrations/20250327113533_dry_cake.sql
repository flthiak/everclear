/*
  # Fix Products Schema

  1. Changes
    - Drop existing products table
    - Create new products table with correct schema
    - Add proper indexes and triggers
*/

-- Drop existing products table
DROP TABLE IF EXISTS products CASCADE;

-- Create products table with correct schema
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  factory_price numeric NOT NULL DEFAULT 0,
  godown_price numeric NOT NULL DEFAULT 0,
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
INSERT INTO products (name, factory_price, godown_price, delivery_price)
VALUES
  ('250ml Bottle', 8.00, 10.00, 12.00),
  ('500ml Bottle', 12.00, 15.00, 18.00),
  ('1000ml Bottle', 16.00, 20.00, 24.00),
  ('250ml Label', 0.35, 0.50, 0.60),
  ('500ml Label', 0.45, 0.60, 0.75),
  ('1000ml Label', 0.55, 0.70, 0.85),
  ('Bottle Cap', 0.25, 0.35, 0.40),
  ('Shrink Wrap', 15.00, 18.00, 20.00),
  ('Box (24 bottles)', 5.00, 6.00, 7.00)
ON CONFLICT DO NOTHING;