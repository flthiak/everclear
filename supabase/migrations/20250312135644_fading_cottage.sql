/*
  # Fix Stock Data Access

  1. Changes
    - Update RLS policies to allow public read access
    - Add insert policies for authenticated users
    - Add sample data for testing
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON production;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON production;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON production;

DROP POLICY IF EXISTS "Enable read access for all users" ON godown_transfers;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON godown_transfers;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON godown_transfers;

-- Create new policies for production table
CREATE POLICY "Enable read access for all users" ON production
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON production
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Create new policies for godown_transfers table
CREATE POLICY "Enable read access for all users" ON godown_transfers
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON godown_transfers
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Insert sample data if tables are empty
INSERT INTO production ("250ml", "500ml", "1000ml", production_date)
SELECT 5000, 3000, 2000, now()
WHERE NOT EXISTS (SELECT 1 FROM production);

INSERT INTO godown_transfers ("250ml", "500ml", "1000ml", transfer_date)
SELECT 4000, 2500, 1500, now()
WHERE NOT EXISTS (SELECT 1 FROM godown_transfers);