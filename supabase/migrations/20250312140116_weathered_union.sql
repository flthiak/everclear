/*
  # Complete Database Schema

  1. New Tables
    - expenses
      - id (uuid, primary key)
      - category (text)
      - amount (numeric)
      - description (text)
      - expense_date (timestamptz)
      - created_at (timestamptz)

    - raw_materials
      - id (uuid, primary key)
      - name (text)
      - type (text)
      - quantity (numeric)
      - unit (text)
      - created_at (timestamptz)
      - updated_at (timestamptz)

    - raw_material_transactions
      - id (uuid, primary key)
      - material_id (uuid, foreign key)
      - type (enum: received, damaged)
      - quantity (numeric)
      - notes (text)
      - transaction_date (timestamptz)
      - created_at (timestamptz)

    - staff
      - id (uuid, primary key)
      - name (text)
      - role (text)
      - base_pay (numeric)
      - current_balance (numeric)
      - join_date (timestamptz)
      - created_at (timestamptz)
      - updated_at (timestamptz)

    - staff_payments
      - id (uuid, primary key)
      - staff_id (uuid, foreign key)
      - amount (numeric)
      - purpose (text)
      - payment_date (timestamptz)
      - created_at (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create custom types
CREATE TYPE raw_material_transaction_type AS ENUM ('received', 'damaged');

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  description text,
  expense_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create raw_materials table
CREATE TABLE IF NOT EXISTS raw_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create raw_material_transactions table
CREATE TABLE IF NOT EXISTS raw_material_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid REFERENCES raw_materials(id) ON DELETE CASCADE,
  type raw_material_transaction_type NOT NULL,
  quantity numeric NOT NULL,
  notes text,
  transaction_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL,
  base_pay numeric NOT NULL DEFAULT 0,
  current_balance numeric NOT NULL DEFAULT 0,
  join_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create staff_payments table
CREATE TABLE IF NOT EXISTS staff_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  purpose text,
  payment_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_material_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_payments ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$ 
BEGIN
  -- Expenses policies
  CREATE POLICY "Enable read access for all users" ON expenses FOR SELECT USING (true);
  CREATE POLICY "Enable insert for authenticated users" ON expenses FOR INSERT TO authenticated WITH CHECK (true);

  -- Raw materials policies
  CREATE POLICY "Enable read access for all users" ON raw_materials FOR SELECT USING (true);
  CREATE POLICY "Enable insert for authenticated users" ON raw_materials FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "Enable update for authenticated users" ON raw_materials FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

  -- Raw material transactions policies
  CREATE POLICY "Enable read access for all users" ON raw_material_transactions FOR SELECT USING (true);
  CREATE POLICY "Enable insert for authenticated users" ON raw_material_transactions FOR INSERT TO authenticated WITH CHECK (true);

  -- Staff policies
  CREATE POLICY "Enable read access for all users" ON staff FOR SELECT USING (true);
  CREATE POLICY "Enable insert for authenticated users" ON staff FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "Enable update for authenticated users" ON staff FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "Enable delete for authenticated users" ON staff FOR DELETE TO authenticated USING (true);

  -- Staff payments policies
  CREATE POLICY "Enable read access for all users" ON staff_payments FOR SELECT USING (true);
  CREATE POLICY "Enable insert for authenticated users" ON staff_payments FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses (category);

CREATE INDEX IF NOT EXISTS idx_raw_materials_name ON raw_materials (name);
CREATE INDEX IF NOT EXISTS idx_raw_materials_type ON raw_materials (type);

CREATE INDEX IF NOT EXISTS idx_raw_material_transactions_date ON raw_material_transactions (transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_raw_material_transactions_material ON raw_material_transactions (material_id);

CREATE INDEX IF NOT EXISTS idx_staff_name ON staff (name);
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff (role);

CREATE INDEX IF NOT EXISTS idx_staff_payments_date ON staff_payments (payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_staff_payments_staff ON staff_payments (staff_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_raw_materials_updated_at
    BEFORE UPDATE ON raw_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at
    BEFORE UPDATE ON staff
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample raw materials if table is empty
INSERT INTO raw_materials (name, type, quantity, unit)
SELECT 'Preform 19.4g', 'preform', 1250000, 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM raw_materials);

INSERT INTO raw_materials (name, type, quantity, unit)
SELECT 'Preform 12.5g', 'preform', 800000, 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM raw_materials WHERE name = 'Preform 12.5g');

INSERT INTO raw_materials (name, type, quantity, unit)
SELECT 'Labels 250ml', 'label', 4000, 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM raw_materials WHERE name = 'Labels 250ml');

INSERT INTO raw_materials (name, type, quantity, unit)
SELECT 'Labels 500ml', 'label', 5000, 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM raw_materials WHERE name = 'Labels 500ml');

INSERT INTO raw_materials (name, type, quantity, unit)
SELECT 'Labels 1000ml', 'label', 2000, 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM raw_materials WHERE name = 'Labels 1000ml');

INSERT INTO raw_materials (name, type, quantity, unit)
SELECT 'Caps 28mm', 'cap', 17000000, 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM raw_materials WHERE name = 'Caps 28mm');

INSERT INTO raw_materials (name, type, quantity, unit)
SELECT 'LD Shrink 580mm x 85mic', 'shrink', 100, 'rolls'
WHERE NOT EXISTS (SELECT 1 FROM raw_materials WHERE name = 'LD Shrink 580mm x 85mic');