/*
  # Additional Database Enhancements

  1. New Tables
    - user_customers (for managing user-customer relationships)
      - user_id (uuid, references auth.users)
      - customer_id (uuid, references customers)
      - role (text)
      - created_at (timestamp)

  2. New Indexes
    - Composite indexes for customers table
    - Partial indexes for common filtering
    - Indexes for user_customers table

  3. Additional Security
    - RLS for user_customers table
    - More granular access control policies
*/

-- Create user_customers table first
CREATE TABLE IF NOT EXISTS user_customers (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer',
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, customer_id)
);

-- Enable RLS on user_customers table
ALTER TABLE user_customers ENABLE ROW LEVEL SECURITY;

-- Add composite indexes for common query patterns
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'customers' AND indexname = 'idx_customers_type_name'
  ) THEN
    CREATE INDEX idx_customers_type_name ON customers (type, name);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'customers' AND indexname = 'idx_customers_created_at'
  ) THEN
    CREATE INDEX idx_customers_created_at ON customers (created_at DESC);
  END IF;
END $$;

-- Add partial indexes for common filtering
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'customers' AND indexname = 'idx_customers_distributors'
  ) THEN
    CREATE INDEX idx_customers_distributors ON customers (name, credit_limit)
    WHERE type = 'distributor';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'customers' AND indexname = 'idx_customers_credit_balance'
  ) THEN
    CREATE INDEX idx_customers_credit_balance ON customers (current_balance)
    WHERE current_balance > 0;
  END IF;
END $$;

-- Add additional policies for more granular access control
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customers' AND policyname = 'Allow insert for verified users'
  ) THEN
    CREATE POLICY "Allow insert for verified users" ON customers
      FOR INSERT TO authenticated
      WITH CHECK (
        auth.email() IS NOT NULL
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customers' AND policyname = 'Allow update of own records'
  ) THEN
    CREATE POLICY "Allow update of own records" ON customers
      FOR UPDATE TO authenticated
      USING (auth.uid() IN (
        SELECT user_id FROM user_customers WHERE customer_id = customers.id
      ))
      WITH CHECK (auth.uid() IN (
        SELECT user_id FROM user_customers WHERE customer_id = customers.id
      ));
  END IF;
END $$;

-- Add policies for user_customers table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_customers' AND policyname = 'Users can view own associations'
  ) THEN
    CREATE POLICY "Users can view own associations" ON user_customers
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Add indexes for user_customers table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'user_customers' AND indexname = 'idx_user_customers_user_id'
  ) THEN
    CREATE INDEX idx_user_customers_user_id ON user_customers (user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'user_customers' AND indexname = 'idx_user_customers_customer_id'
  ) THEN
    CREATE INDEX idx_user_customers_customer_id ON user_customers (customer_id);
  END IF;
END $$;