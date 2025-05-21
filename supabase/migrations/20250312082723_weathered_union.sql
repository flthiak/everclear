/*
  # Add Product Management Policies

  1. Security Updates
    - Add CRUD policies for products table
    - Enable full management for authenticated users

  2. Additional Indexes
    - Add indexes for common product queries
    - Add composite indexes for performance
*/

-- Add policies for products table
DO $$ 
BEGIN
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

-- Add additional indexes for products
DO $$ 
BEGIN
  -- Index for name searches
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'products' AND indexname = 'idx_products_name'
  ) THEN
    CREATE INDEX idx_products_name ON products (name);
  END IF;

  -- Composite index for type and name
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'products' AND indexname = 'idx_products_type_name'
  ) THEN
    CREATE INDEX idx_products_type_name ON products (type, name);
  END IF;

  -- Index for price ranges
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'products' AND indexname = 'idx_products_customer_price'
  ) THEN
    CREATE INDEX idx_products_customer_price ON products (customer_price);
  END IF;
END $$;