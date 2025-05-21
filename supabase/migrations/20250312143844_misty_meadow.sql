/*
  # Stock Management Tables

  1. New Tables
    - production
      - id (uuid, primary key)
      - 250ml (integer)
      - 500ml (integer)
      - 1000ml (integer)
      - production_date (timestamptz)
      - created_at (timestamptz)

    - godown_transfers
      - id (uuid, primary key)
      - 250ml (integer)
      - 500ml (integer)
      - 1000ml (integer)
      - transfer_date (timestamptz)
      - created_at (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create production table
CREATE TABLE IF NOT EXISTS production (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "250ml" integer NOT NULL DEFAULT 0,
  "500ml" integer NOT NULL DEFAULT 0,
  "1000ml" integer NOT NULL DEFAULT 0,
  production_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create godown_transfers table
CREATE TABLE IF NOT EXISTS godown_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "250ml" integer NOT NULL DEFAULT 0,
  "500ml" integer NOT NULL DEFAULT 0,
  "1000ml" integer NOT NULL DEFAULT 0,
  transfer_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE production ENABLE ROW LEVEL SECURITY;
ALTER TABLE godown_transfers ENABLE ROW LEVEL SECURITY;

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
CREATE INDEX idx_production_date ON production (production_date DESC);
CREATE INDEX idx_transfer_date ON godown_transfers (transfer_date DESC);

-- Insert sample data
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