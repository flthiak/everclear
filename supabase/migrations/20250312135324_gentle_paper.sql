/*
  # Fix Stock Data Access

  1. Changes
    - Add public read access to production and godown_transfers tables
    - Update RLS policies to allow public access
    - Keep authenticated-only insert policies
*/

-- Update RLS policies for production table
DROP POLICY IF EXISTS "Enable read access for all users" ON production;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON production;

CREATE POLICY "Enable read access for all users" ON production
  FOR SELECT USING (true);

-- Update RLS policies for godown_transfers table
DROP POLICY IF EXISTS "Enable read access for all users" ON godown_transfers;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON godown_transfers;

CREATE POLICY "Enable read access for all users" ON godown_transfers
  FOR SELECT USING (true);