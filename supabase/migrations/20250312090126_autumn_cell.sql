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
CREATE POLICY "Enable read access for authenticated users" ON production
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users" ON production
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Create policies for godown_transfers table
CREATE POLICY "Enable read access for authenticated users" ON godown_transfers
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users" ON godown_transfers
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_production_date ON production (production_date DESC);
CREATE INDEX idx_transfer_date ON godown_transfers (transfer_date DESC);

-- Insert initial data
INSERT INTO production ("250ml", "500ml", "1000ml", production_date)
VALUES (0, 0, 0, now());

INSERT INTO godown_transfers ("250ml", "500ml", "1000ml", transfer_date)
VALUES (0, 0, 0, now());