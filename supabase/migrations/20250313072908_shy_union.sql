/*
  # Fix Stock Management RLS Policies

  1. Changes
    - Drop existing policies
    - Create new policies with proper authentication checks
    - Ensure authenticated users can perform necessary operations
    - Fix policy syntax and role checks

  2. Security
    - Enable RLS
    - Add proper authentication checks
    - Maintain public read access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON production;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON production;
DROP POLICY IF EXISTS "Enable read access for all users" ON godown_transfers;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON godown_transfers;

-- Create new policies for production table
CREATE POLICY "Enable read access for all users" ON production
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON production
  FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

-- Create new policies for godown_transfers table
CREATE POLICY "Enable read access for all users" ON godown_transfers
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON godown_transfers
  FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

-- Ensure RLS is enabled
ALTER TABLE production ENABLE ROW LEVEL SECURITY;
ALTER TABLE godown_transfers ENABLE ROW LEVEL SECURITY;