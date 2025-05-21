/*
  # Update Stock Management Schema

  1. New Tables
    - daily_production
      - id (uuid, primary key)
      - 250ml (integer)
      - 500ml (integer)
      - 1000ml (integer)
      - production_date (timestamptz)
      - created_at (timestamptz)

    - factory_stock
      - id (uuid, primary key)
      - 250ml (integer)
      - 500ml (integer)
      - 1000ml (integer)
      - updated_at (timestamptz)

    - godown_stock
      - id (uuid, primary key)
      - 250ml (integer)
      - 500ml (integer)
      - 1000ml (integer)
      - updated_at (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Drop existing tables
DROP TABLE IF EXISTS production CASCADE;
DROP TABLE IF EXISTS godown_transfers CASCADE;

-- Create daily_production table
CREATE TABLE daily_production (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "250ml" integer NOT NULL DEFAULT 0,
  "500ml" integer NOT NULL DEFAULT 0,
  "1000ml" integer NOT NULL DEFAULT 0,
  production_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create factory_stock table
CREATE TABLE factory_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "250ml" integer NOT NULL DEFAULT 0,
  "500ml" integer NOT NULL DEFAULT 0,
  "1000ml" integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Create godown_stock table
CREATE TABLE godown_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "250ml" integer NOT NULL DEFAULT 0,
  "500ml" integer NOT NULL DEFAULT 0,
  "1000ml" integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE daily_production ENABLE ROW LEVEL SECURITY;
ALTER TABLE factory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE godown_stock ENABLE ROW LEVEL SECURITY;

-- Create policies for daily_production table
CREATE POLICY "Enable read access for all users" ON daily_production
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON daily_production
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Create policies for factory_stock table
CREATE POLICY "Enable read access for all users" ON factory_stock
  FOR SELECT USING (true);

CREATE POLICY "Enable update for authenticated users" ON factory_stock
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for godown_stock table
CREATE POLICY "Enable read access for all users" ON godown_stock
  FOR SELECT USING (true);

CREATE POLICY "Enable update for authenticated users" ON godown_stock
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_daily_production_date ON daily_production (production_date DESC);
CREATE INDEX idx_factory_stock_updated ON factory_stock (updated_at DESC);
CREATE INDEX idx_godown_stock_updated ON godown_stock (updated_at DESC);

-- Insert initial stock data
INSERT INTO factory_stock ("250ml", "500ml", "1000ml", updated_at)
VALUES (0, 0, 0, now())
ON CONFLICT DO NOTHING;

INSERT INTO godown_stock ("250ml", "500ml", "1000ml", updated_at)
VALUES (0, 0, 0, now())
ON CONFLICT DO NOTHING;

-- Insert sample daily production data
INSERT INTO daily_production ("250ml", "500ml", "1000ml", production_date)
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