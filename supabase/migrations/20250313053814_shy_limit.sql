/*
  # Fix RLS Policies for Staff and Production Tables

  1. Changes
    - Drop existing RLS policies
    - Create new policies with proper authentication checks
    - Enable insert operations for authenticated users

  2. Security
    - Ensure proper authentication checks
    - Maintain data access control
*/

-- Fix staff table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON staff;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON staff;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON staff;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON staff;

CREATE POLICY "Enable read access for all users" ON staff
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON staff
  FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON staff
  FOR UPDATE TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON staff
  FOR DELETE TO authenticated
  USING (auth.role() = 'authenticated');

-- Fix production table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON production;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON production;

CREATE POLICY "Enable read access for all users" ON production
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON production
  FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

-- Fix godown_transfers table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON godown_transfers;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON godown_transfers;

CREATE POLICY "Enable read access for all users" ON godown_transfers
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON godown_transfers
  FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated');