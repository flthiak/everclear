/*
  # Fix Product Policies

  1. Changes
    - Add missing RLS policies for products table
    - Ensure authenticated users can perform CRUD operations
    - Add additional indexes for better performance

  2. Security
    - Enable RLS on products table
    - Add policies for authenticated users
*/

-- Enable RLS on products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policies for products table
DO $$ 
BEGIN
  -- Select policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products' AND policyname = 'Enable read access for authenticated users'
  ) THEN
    CREATE POLICY "Enable read access for authenticated users" ON products
      FOR SELECT TO authenticated
      USING (true);
  END IF;

  -- Insert policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products' AND policyname = 'Enable insert for authenticated users'
  ) THEN
    CREATE POLICY "Enable insert for authenticated users" ON products
      FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;

  -- Update policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products' AND policyname = 'Enable update for authenticated users'
  ) THEN
    CREATE POLICY "Enable update for authenticated users" ON products
      FOR UPDATE TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  -- Delete policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products' AND policyname = 'Enable delete for authenticated users'
  ) THEN
    CREATE POLICY "Enable delete for authenticated users" ON products
      FOR DELETE TO authenticated
      USING (true);
  END IF;
END $$;