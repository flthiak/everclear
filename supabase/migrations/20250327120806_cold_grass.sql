/*
  # Add Expense Tracker Schema

  1. New Tables
    - expenses
      - id (uuid, primary key)
      - category (text)
      - amount (numeric)
      - description (text)
      - expense_date (timestamptz)
      - created_at (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create expenses table
CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  description text,
  expense_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON expenses
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON expenses
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON expenses
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON expenses
  FOR DELETE TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_date ON expenses(expense_date DESC);

-- Insert sample expense categories if needed
INSERT INTO expenses (category, amount, description, expense_date)
VALUES
  ('utilities', 45000, 'Monthly electricity bill', now() - interval '7 days'),
  ('medical', 15000, 'Staff medical expenses', now() - interval '6 days'),
  ('maintenance', 25000, 'Vehicle maintenance', now() - interval '5 days'),
  ('transport', 12000, 'Fuel expenses', now() - interval '4 days'),
  ('food', 8000, 'Staff meals', now() - interval '3 days'),
  ('other', 5000, 'Miscellaneous expenses', now() - interval '2 days')
ON CONFLICT DO NOTHING;