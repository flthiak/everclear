/*
  # Create customers table and related schemas

  1. New Tables
    - `customers`
      - `id` (uuid, primary key)
      - `type` (enum: customer, distributor, counter)
      - `name` (text)
      - `phone` (text, nullable)
      - `address` (text, nullable)
      - `credit_limit` (numeric)
      - `current_balance` (numeric)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on customers table
    - Add policies for CRUD operations
*/

-- Create customers table if it doesn't exist
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type customer_type NOT NULL,
  name text NOT NULL,
  phone text,
  address text,
  credit_limit numeric NOT NULL DEFAULT 0,
  current_balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customers' AND policyname = 'Enable read access for all users'
  ) THEN
    CREATE POLICY "Enable read access for all users" ON customers FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customers' AND policyname = 'Enable insert access for authenticated users'
  ) THEN
    CREATE POLICY "Enable insert access for authenticated users" ON customers FOR INSERT
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customers' AND policyname = 'Enable update access for authenticated users'
  ) THEN
    CREATE POLICY "Enable update access for authenticated users" ON customers FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customers' AND policyname = 'Enable delete access for authenticated users'
  ) THEN
    CREATE POLICY "Enable delete access for authenticated users" ON customers FOR DELETE
      USING (true);
  END IF;
END $$;

-- Create indexes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'customers' AND indexname = 'customers_type_idx'
  ) THEN
    CREATE INDEX customers_type_idx ON customers (type);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'customers' AND indexname = 'customers_name_idx'
  ) THEN
    CREATE INDEX customers_name_idx ON customers (name);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'customers' AND indexname = 'customers_phone_idx'
  ) THEN
    CREATE INDEX customers_phone_idx ON customers (phone);
  END IF;
END $$;

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_customers_updated_at'
  ) THEN
    CREATE TRIGGER update_customers_updated_at
      BEFORE UPDATE ON customers
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;