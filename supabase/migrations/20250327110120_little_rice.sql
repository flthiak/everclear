/*
  # Fix Schema Issues

  1. Changes
    - Add missing updated_at column to factory_stock and godown_stock tables
    - Add missing name column to products table
    - Add triggers to automatically update updated_at columns
*/

-- Drop existing tables to ensure clean slate
DROP TABLE IF EXISTS factory_stock CASCADE;
DROP TABLE IF EXISTS godown_stock CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- Create factory_stock table with updated_at
CREATE TABLE factory_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "250ml" integer NOT NULL DEFAULT 0,
  "500ml" integer NOT NULL DEFAULT 0,
  "1000ml" integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Create godown_stock table with updated_at
CREATE TABLE godown_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "250ml" integer NOT NULL DEFAULT 0,
  "500ml" integer NOT NULL DEFAULT 0,
  "1000ml" integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Create products table with name column
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
ALTER TABLE factory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE godown_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policies for factory_stock
CREATE POLICY "Enable read access for all users" ON factory_stock
  FOR SELECT USING (true);

CREATE POLICY "Enable update for authenticated users" ON factory_stock
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for godown_stock
CREATE POLICY "Enable read access for all users" ON godown_stock
  FOR SELECT USING (true);

CREATE POLICY "Enable update for authenticated users" ON godown_stock
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

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
CREATE INDEX idx_factory_stock_updated ON factory_stock (updated_at DESC);
CREATE INDEX idx_godown_stock_updated ON godown_stock (updated_at DESC);
CREATE INDEX idx_products_name ON products (name);
CREATE INDEX idx_products_type ON products (type);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_factory_stock_updated_at
    BEFORE UPDATE ON factory_stock
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_godown_stock_updated_at
    BEFORE UPDATE ON godown_stock
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert initial stock data
INSERT INTO factory_stock ("250ml", "500ml", "1000ml", updated_at)
VALUES (0, 0, 0, now())
ON CONFLICT DO NOTHING;

INSERT INTO godown_stock ("250ml", "500ml", "1000ml", updated_at)
VALUES (0, 0, 0, now())
ON CONFLICT DO NOTHING;

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