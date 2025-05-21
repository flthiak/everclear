/*
  # Fix Products Schema

  1. Changes
    - Drop existing products table
    - Create new products table with manual product_id
    - Add proper indexes and constraints
*/

-- Drop existing tables to ensure clean slate
DROP TABLE IF EXISTS factory_stock CASCADE;
DROP TABLE IF EXISTS godown_stock CASCADE;
DROP TABLE IF EXISTS daily_production CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP SEQUENCE IF EXISTS product_id_seq;

-- Create products table
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  product_name text NOT NULL,
  factory_price numeric NOT NULL DEFAULT 0,
  godown_price numeric NOT NULL DEFAULT 0,
  delivery_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create factory_stock table
CREATE TABLE factory_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id)
);

-- Create godown_stock table
CREATE TABLE godown_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id)
);

-- Create daily_production table
CREATE TABLE daily_production (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  production_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE factory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE godown_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_production ENABLE ROW LEVEL SECURITY;

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

-- Create policies for factory_stock
CREATE POLICY "Enable read access for all users" ON factory_stock
  FOR SELECT USING (true);

CREATE POLICY "Enable update for authenticated users" ON factory_stock
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users" ON factory_stock
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Create policies for godown_stock
CREATE POLICY "Enable read access for all users" ON godown_stock
  FOR SELECT USING (true);

CREATE POLICY "Enable update for authenticated users" ON godown_stock
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users" ON godown_stock
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Create policies for daily_production
CREATE POLICY "Enable read access for all users" ON daily_production
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON daily_production
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Create indexes
CREATE UNIQUE INDEX idx_products_product_id ON products(product_id);
CREATE INDEX idx_products_product_name ON products(product_name);
CREATE INDEX idx_factory_stock_product ON factory_stock(product_id);
CREATE INDEX idx_factory_stock_updated ON factory_stock(updated_at DESC);
CREATE INDEX idx_godown_stock_product ON godown_stock(product_id);
CREATE INDEX idx_godown_stock_updated ON godown_stock(updated_at DESC);
CREATE INDEX idx_daily_production_product ON daily_production(product_id);
CREATE INDEX idx_daily_production_date ON daily_production(production_date DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
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
INSERT INTO products (product_id, product_name, factory_price, godown_price, delivery_price)
VALUES
  ('001', '250ml Bottle', 8.00, 10.00, 12.00),
  ('002', '500ml Bottle', 12.00, 15.00, 18.00),
  ('003', '1000ml Bottle', 16.00, 20.00, 24.00),
  ('004', '250ml Label', 0.35, 0.50, 0.60),
  ('005', '500ml Label', 0.45, 0.60, 0.75),
  ('006', '1000ml Label', 0.55, 0.70, 0.85),
  ('007', 'Bottle Cap', 0.25, 0.35, 0.40),
  ('008', 'Shrink Wrap', 15.00, 18.00, 20.00),
  ('009', 'Box (24 bottles)', 5.00, 6.00, 7.00)
ON CONFLICT DO NOTHING;

-- Initialize stock records for existing products
INSERT INTO factory_stock (product_id, quantity)
SELECT id, 0
FROM products
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO godown_stock (product_id, quantity)
SELECT id, 0
FROM products
ON CONFLICT (product_id) DO NOTHING;

-- Create function to automatically create stock records for new products
CREATE OR REPLACE FUNCTION create_stock_records()
RETURNS TRIGGER AS $$
BEGIN
  -- Create factory stock record
  INSERT INTO factory_stock (product_id, quantity)
  VALUES (NEW.id, 0)
  ON CONFLICT DO NOTHING;

  -- Create godown stock record
  INSERT INTO godown_stock (product_id, quantity)
  VALUES (NEW.id, 0)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically create stock records when new products are added
CREATE TRIGGER create_stock_records_trigger
    AFTER INSERT ON products
    FOR EACH ROW
    EXECUTE FUNCTION create_stock_records();