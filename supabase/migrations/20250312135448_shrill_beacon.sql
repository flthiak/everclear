/*
  # Fix Stock Data Access

  1. Changes
    - Create production and godown_transfers tables if they don't exist
    - Add public read access policies
    - Add sample data for testing
*/

-- Create production table if it doesn't exist
CREATE TABLE IF NOT EXISTS production (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "250ml" integer NOT NULL DEFAULT 0,
  "500ml" integer NOT NULL DEFAULT 0,
  "1000ml" integer NOT NULL DEFAULT 0,
  production_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create godown_transfers table if it doesn't exist
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

-- Update RLS policies for public read access
DROP POLICY IF EXISTS "Enable read access for all users" ON production;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON production;

CREATE POLICY "Enable read access for all users" ON production
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON godown_transfers;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON godown_transfers;

CREATE POLICY "Enable read access for all users" ON godown_transfers
  FOR SELECT USING (true);

-- Insert sample data if tables are empty
INSERT INTO production ("250ml", "500ml", "1000ml", production_date)
SELECT 5000, 3000, 2000, now()
WHERE NOT EXISTS (SELECT 1 FROM production);

INSERT INTO godown_transfers ("250ml", "500ml", "1000ml", transfer_date)
SELECT 4000, 2500, 1500, now()
WHERE NOT EXISTS (SELECT 1 FROM godown_transfers);