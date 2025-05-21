/*
  # Fix Stock Tables

  1. New Tables
    - `production`
      - `id` (uuid, primary key)
      - `250ml` (integer)
      - `500ml` (integer)
      - `1000ml` (integer)
      - `production_date` (timestamp)
      - `created_at` (timestamp)

    - `godown_transfers`
      - `id` (uuid, primary key)
      - `250ml` (integer)
      - `500ml` (integer)
      - `1000ml` (integer)
      - `transfer_date` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS production CASCADE;
DROP TABLE IF EXISTS godown_transfers CASCADE;

-- Create production table
CREATE TABLE production (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "250ml" integer NOT NULL DEFAULT 0,
  "500ml" integer NOT NULL DEFAULT 0,
  "1000ml" integer NOT NULL DEFAULT 0,
  production_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create godown_transfers table
CREATE TABLE godown_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "250ml" integer NOT NULL DEFAULT 0,
  "500ml" integer NOT NULL DEFAULT 0,
  "1000ml" integer NOT NULL DEFAULT 0,
  transfer_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE production ENABLE ROW LEVEL SECURITY;
ALTER TABLE godown_transfers ENABLE ROW LEVEL SECURITY;

-- Create policies for production table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'production' AND policyname = 'Enable read access for all users'
  ) THEN
    CREATE POLICY "Enable read access for all users" ON production
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'production' AND policyname = 'Enable insert for authenticated users'
  ) THEN
    CREATE POLICY "Enable insert for authenticated users" ON production
      FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Create policies for godown_transfers table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'godown_transfers' AND policyname = 'Enable read access for all users'
  ) THEN
    CREATE POLICY "Enable read access for all users" ON godown_transfers
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'godown_transfers' AND policyname = 'Enable insert for authenticated users'
  ) THEN
    CREATE POLICY "Enable insert for authenticated users" ON godown_transfers
      FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_production_date ON production (production_date DESC);
CREATE INDEX IF NOT EXISTS idx_transfer_date ON godown_transfers (transfer_date DESC);

-- Insert initial data if tables are empty
INSERT INTO production ("250ml", "500ml", "1000ml", production_date)
SELECT 0, 0, 0, now()
WHERE NOT EXISTS (SELECT 1 FROM production);

INSERT INTO godown_transfers ("250ml", "500ml", "1000ml", transfer_date)
SELECT 0, 0, 0, now()
WHERE NOT EXISTS (SELECT 1 FROM godown_transfers);