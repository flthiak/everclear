/*
  # Remove Type Column from Products Table

  1. Changes
    - Remove type column from products table
    - Update existing RLS policies
*/

-- Drop type column from products table
ALTER TABLE products DROP COLUMN IF EXISTS type;

-- Update RLS policies to remove type references
DROP POLICY IF EXISTS "Enable read access for everyone" ON products;
DROP POLICY IF EXISTS "Enable insert for everyone" ON products;
DROP POLICY IF EXISTS "Enable update for everyone" ON products;
DROP POLICY IF EXISTS "Enable delete for everyone" ON products;

-- Recreate policies without type column references
CREATE POLICY "Enable read access for everyone" ON products
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for everyone" ON products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for everyone" ON products
  FOR UPDATE USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for everyone" ON products
  FOR DELETE USING (true);