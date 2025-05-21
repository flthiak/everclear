/*
  # Fix Product Policies

  1. Changes
    - Add missing RLS policies for products table
    - Ensure public access for product reads
    - Add policies for authenticated users

  2. Security
    - Enable RLS on products table
    - Add policies for both public and authenticated users
*/

-- Enable RLS on products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policies for products table
DO $$ 
BEGIN
  -- Public read access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products' AND policyname = 'Enable read access for all users'
  ) THEN
    CREATE POLICY "Enable read access for all users" ON products
      FOR SELECT
      USING (true);
  END IF;

  -- Authenticated user policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products' AND policyname = 'Enable insert for authenticated users'
  ) THEN
    CREATE POLICY "Enable insert for authenticated users" ON products
      FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products' AND policyname = 'Enable update for authenticated users'
  ) THEN
    CREATE POLICY "Enable update for authenticated users" ON products
      FOR UPDATE TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products' AND policyname = 'Enable delete for authenticated users'
  ) THEN
    CREATE POLICY "Enable delete for authenticated users" ON products
      FOR DELETE TO authenticated
      USING (true);
  END IF;
END $$;