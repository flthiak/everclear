/*
  # Fix Staff Schema and Policies

  1. Tables
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
    - Enable RLS
    - Add policies for CRUD operations
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS staff_payments CASCADE;
DROP TABLE IF EXISTS staff CASCADE;

-- Create staff table
CREATE TABLE staff (
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
CREATE TABLE staff_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  purpose text,
  payment_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for staff table
CREATE POLICY "Enable read access for all users" ON staff
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON staff
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON staff
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON staff
  FOR DELETE TO authenticated
  USING (true);

-- Create policies for staff_payments table
CREATE POLICY "Enable read access for all users" ON staff_payments
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON staff_payments
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_staff_name ON staff (name);
CREATE INDEX idx_staff_role ON staff (role);
CREATE INDEX idx_staff_payments_date ON staff_payments (payment_date DESC);
CREATE INDEX idx_staff_payments_staff ON staff_payments (staff_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_staff_updated_at
    BEFORE UPDATE ON staff
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample staff data
INSERT INTO staff (name, role, base_pay, current_balance, join_date)
VALUES 
  ('John Smith', 'Manager', 50000, 50000, now()),
  ('Jane Doe', 'Supervisor', 35000, 35000, now()),
  ('Mike Johnson', 'Worker', 25000, 25000, now())
ON CONFLICT DO NOTHING;