-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact TEXT,
  invoice_amount DECIMAL(10,2) DEFAULT 0,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create supplier_expenses table
CREATE TABLE IF NOT EXISTS supplier_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  invoice_amount DECIMAL(10,2) NOT NULL,
  payment_amount DECIMAL(10,2) DEFAULT 0,
  payment_date DATE,
  description TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment_history table
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID NOT NULL REFERENCES supplier_expenses(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payment_method TEXT DEFAULT 'Cash',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to update supplier aggregates
CREATE OR REPLACE FUNCTION update_supplier_aggregates()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the supplier's total invoice and paid amounts
  UPDATE suppliers
  SET 
    invoice_amount = (
      SELECT COALESCE(SUM(invoice_amount), 0)
      FROM supplier_expenses
      WHERE supplier_id = NEW.supplier_id
    ),
    paid_amount = (
      SELECT COALESCE(SUM(payment_amount), 0)
      FROM supplier_expenses
      WHERE supplier_id = NEW.supplier_id
    ),
    updated_at = NOW()
  WHERE id = NEW.supplier_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update supplier aggregates
DROP TRIGGER IF EXISTS update_supplier_on_expense_change ON supplier_expenses;
CREATE TRIGGER update_supplier_on_expense_change
AFTER INSERT OR UPDATE OR DELETE ON supplier_expenses
FOR EACH ROW EXECUTE FUNCTION update_supplier_aggregates();

-- Create function to determine expense status
CREATE OR REPLACE FUNCTION update_supplier_expense_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Determine status based on payment amount
  IF NEW.payment_amount >= NEW.invoice_amount THEN
    NEW.status := 'paid';
  ELSIF NEW.payment_amount > 0 THEN
    NEW.status := 'partial';
  ELSE
    NEW.status := 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for setting expense status
DROP TRIGGER IF EXISTS set_supplier_expense_status ON supplier_expenses;
CREATE TRIGGER set_supplier_expense_status
BEFORE INSERT OR UPDATE ON supplier_expenses
FOR EACH ROW EXECUTE FUNCTION update_supplier_expense_status();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_supplier_expenses_supplier_id ON supplier_expenses(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_expenses_invoice_date ON supplier_expenses(invoice_date);
CREATE INDEX IF NOT EXISTS idx_payment_history_expense_id ON payment_history(expense_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_payment_date ON payment_history(payment_date);

-- Insert sample data
INSERT INTO suppliers (name, contact)
VALUES 
  ('ABC Building Materials', '+91 98765 43210'),
  ('XYZ Equipment Rentals', 'xyz@example.com'),
  ('Deluxe Hardware Store', NULL),
  ('Premium Paint Supplies', 'contact@premiumpaint.com')
ON CONFLICT (id) DO NOTHING; 