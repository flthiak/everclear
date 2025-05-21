/*
  # Update Products Table RLS Policies

  1. Changes
    - Drop existing RLS policies
    - Create new policies allowing public read/write access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON products;

-- Create new policies for public access
CREATE POLICY "Enable read access for everyone" ON products
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for everyone" ON products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for everyone" ON products
  FOR UPDATE USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for everyone" ON products
  FOR DELETE USING (true);