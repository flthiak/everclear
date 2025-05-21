/*
  # Fix Stock Management Tables

  1. Changes
    - Drop and recreate products table with correct schema
    - Create factory_stock and godown_stock tables with proper columns
    - Add RLS policies and indexes
*/

-- Drop existing tables
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS factory_stock CASCADE;
DROP TABLE IF EXISTS godown_stock CASCADE;

-- Create products table
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  factory_price numeric NOT NULL DEFAULT 0,
  customer_price numeric NOT NULL DEFAULT 0,
  delivery_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create factory_stock table
CREATE TABLE factory_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "250ml" integer NOT NULL DEFAULT 0,
  "500ml" integer NOT NULL DEFAULT 0,
  "1000ml" integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create godown_stock table
CREATE TABLE godown_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "250ml" integer NOT NULL DEFAULT 0,
  "500ml" integer NOT NULL DEFAULT 0,
  "1000ml" integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE factory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE godown_stock ENABLE ROW LEVEL SECURITY;

-- Create policies for products
CREATE POLICY "Enable read access for everyone" ON products
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for everyone" ON products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for everyone" ON products
  FOR UPDATE USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for everyone" ON products
  FOR DELETE USING (true);

-- Create policies for factory_stock
CREATE POLICY "Enable read access for everyone" ON factory_stock
  FOR SELECT USING (true);

CREATE POLICY "Enable update for everyone" ON factory_stock
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- Create policies for godown_stock
CREATE POLICY "Enable read access for everyone" ON godown_stock
  FOR SELECT USING (true);

CREATE POLICY "Enable update for everyone" ON godown_stock
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_products_name ON products (name);
CREATE INDEX idx_factory_stock_updated ON factory_stock (updated_at DESC);
CREATE INDEX idx_godown_stock_updated ON godown_stock (updated_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_factory_stock_updated_at
    BEFORE UPDATE ON factory_stock
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_godown_stock_updated_at
    BEFORE UPDATE ON godown_stock
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample products data
INSERT INTO products (name, factory_price, customer_price, delivery_price)
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

-- Insert initial stock data
INSERT INTO factory_stock ("250ml", "500ml", "1000ml")
VALUES (0, 0, 0)
ON CONFLICT DO NOTHING;

INSERT INTO godown_stock ("250ml", "500ml", "1000ml")
VALUES (0, 0, 0)
ON CONFLICT DO NOTHING;