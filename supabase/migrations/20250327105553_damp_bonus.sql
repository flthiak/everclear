/*
  # Fix Database Schema

  1. Changes
    - Create production table if it doesn't exist
    - Create products table with proper columns
    - Add proper indexes and RLS policies

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Drop existing tables if they exist to ensure clean slate
DROP TABLE IF EXISTS production CASCADE;
DROP TABLE IF EXISTS godown_transfers CASCADE;
DROP TABLE IF EXISTS products CASCADE;

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

-- Create production table
CREATE TABLE production (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "250ml" integer NOT NULL DEFAULT 0,
  "500ml" integer NOT NULL DEFAULT 0,
  "1000ml" integer NOT NULL DEFAULT 0,
  production_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create godown_transfers table
CREATE TABLE godown_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "250ml" integer NOT NULL DEFAULT 0,
  "500ml" integer NOT NULL DEFAULT 0,
  "1000ml" integer NOT NULL DEFAULT 0,
  transfer_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE production ENABLE ROW LEVEL SECURITY;
ALTER TABLE godown_transfers ENABLE ROW LEVEL SECURITY;

-- Create policies for products table
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

-- Create policies for production table
CREATE POLICY "Enable read access for all users" ON production
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON production
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Create policies for godown_transfers table
CREATE POLICY "Enable read access for all users" ON godown_transfers
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON godown_transfers
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_products_name ON products (name);
CREATE INDEX idx_products_type ON products (type);
CREATE INDEX idx_production_date ON production (production_date DESC);
CREATE INDEX idx_transfer_date ON godown_transfers (transfer_date DESC);

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

-- Insert sample production data
INSERT INTO production ("250ml", "500ml", "1000ml", production_date)
VALUES
  (5000, 3000, 2000, now() - interval '7 days'),
  (4500, 3500, 1800, now() - interval '6 days'),
  (5500, 2800, 2200, now() - interval '5 days'),
  (4800, 3200, 1900, now() - interval '4 days'),
  (5200, 3100, 2100, now() - interval '3 days'),
  (4700, 3300, 1850, now() - interval '2 days'),
  (5100, 2900, 2050, now() - interval '1 day'),
  (4900, 3400, 1950, now())
ON CONFLICT DO NOTHING;

-- Insert sample godown transfer data
INSERT INTO godown_transfers ("250ml", "500ml", "1000ml", transfer_date)
VALUES
  (4000, 2500, 1500, now() - interval '7 days'),
  (3500, 3000, 1300, now() - interval '6 days'),
  (4500, 2300, 1800, now() - interval '5 days'),
  (3800, 2700, 1400, now() - interval '4 days'),
  (4200, 2600, 1700, now() - interval '3 days'),
  (3700, 2800, 1350, now() - interval '2 days'),
  (4100, 2400, 1650, now() - interval '1 day'),
  (3900, 2900, 1450, now())
ON CONFLICT DO NOTHING;