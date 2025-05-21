/*
  # Dynamic Stock Management Schema

  1. New Tables
    - factory_stock
      - id (uuid, primary key)
      - product_id (uuid, foreign key)
      - quantity (integer)
      - updated_at (timestamptz)

    - godown_stock
      - id (uuid, primary key)
      - product_id (uuid, foreign key)
      - quantity (integer)
      - updated_at (timestamptz)

    - daily_production
      - id (uuid, primary key)
      - product_id (uuid, foreign key)
      - quantity (integer)
      - production_date (timestamptz)
      - created_at (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Drop existing tables
DROP TABLE IF EXISTS factory_stock CASCADE;
DROP TABLE IF EXISTS godown_stock CASCADE;
DROP TABLE IF EXISTS daily_production CASCADE;

-- Create factory_stock table
CREATE TABLE factory_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id)
);

-- Create godown_stock table
CREATE TABLE godown_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id)
);

-- Create daily_production table
CREATE TABLE daily_production (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  production_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE factory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE godown_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_production ENABLE ROW LEVEL SECURITY;

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
CREATE TRIGGER update_factory_stock_updated_at
    BEFORE UPDATE ON factory_stock
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_godown_stock_updated_at
    BEFORE UPDATE ON godown_stock
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Initialize stock records for existing products
INSERT INTO factory_stock (product_id, quantity)
SELECT id, 0
FROM products
ON CONFLICT DO NOTHING;

INSERT INTO godown_stock (product_id, quantity)
SELECT id, 0
FROM products
ON CONFLICT DO NOTHING;

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