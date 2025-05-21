/*
  # Stock Management Tables

  1. New Tables
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

    - daily_production
      - id (uuid, primary key)
      - 250ml (integer)
      - 500ml (integer)
      - 1000ml (integer)
      - production_date (timestamptz)
      - created_at (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

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

-- Create daily_production table
CREATE TABLE daily_production (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "250ml" integer NOT NULL DEFAULT 0,
  "500ml" integer NOT NULL DEFAULT 0,
  "1000ml" integer NOT NULL DEFAULT 0,
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

-- Create policies for godown_stock
CREATE POLICY "Enable read access for all users" ON godown_stock
  FOR SELECT USING (true);

CREATE POLICY "Enable update for authenticated users" ON godown_stock
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for daily_production
CREATE POLICY "Enable read access for all users" ON daily_production
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON daily_production
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_factory_stock_updated ON factory_stock (updated_at DESC);
CREATE INDEX idx_godown_stock_updated ON godown_stock (updated_at DESC);
CREATE INDEX idx_daily_production_date ON daily_production (production_date DESC);

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

-- Insert initial stock data
INSERT INTO factory_stock ("250ml", "500ml", "1000ml")
VALUES (0, 0, 0)
ON CONFLICT DO NOTHING;

INSERT INTO godown_stock ("250ml", "500ml", "1000ml")
VALUES (0, 0, 0)
ON CONFLICT DO NOTHING;