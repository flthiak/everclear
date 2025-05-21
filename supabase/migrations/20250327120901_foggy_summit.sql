/*
  # Fix Expenses Schema

  1. Changes
    - Drop and recreate expenses table with correct schema
    - Add proper indexes and RLS policies
    - Add sample data
*/

-- Drop existing expenses table if it exists
DROP TABLE IF EXISTS expenses CASCADE;

-- Create expenses table with correct schema
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

-- Create policies for public access
CREATE POLICY "Enable read access for everyone" ON expenses
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for everyone" ON expenses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for everyone" ON expenses
  FOR UPDATE USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for everyone" ON expenses
  FOR DELETE USING (true);

-- Create indexes
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_date ON expenses(expense_date DESC);

-- Insert sample data
INSERT INTO expenses (category, amount, description, expense_date)
VALUES
  ('utilities', 45000, 'Monthly electricity bill', now() - interval '7 days'),
  ('medical', 15000, 'Staff medical expenses', now() - interval '6 days'),
  ('maintenance', 25000, 'Vehicle maintenance', now() - interval '5 days'),
  ('transport', 12000, 'Fuel expenses', now() - interval '4 days'),
  ('food', 8000, 'Staff meals', now() - interval '3 days'),
  ('other', 5000, 'Miscellaneous expenses', now() - interval '2 days')
ON CONFLICT DO NOTHING;