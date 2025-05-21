/*
  # Initial Database Schema

  1. New Tables
    - customers
    - products
    - sales
    - sale_items
    - payments

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create custom types if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_type') THEN
    CREATE TYPE customer_type AS ENUM ('customer', 'distributor', 'counter');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE payment_method AS ENUM ('cash', 'credit');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sale_status') THEN
    CREATE TYPE sale_status AS ENUM ('pending', 'completed', 'cancelled');
  END IF;
END $$;

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type customer_type NOT NULL,
  name text NOT NULL,
  phone text,
  address text,
  credit_limit numeric DEFAULT 0,
  current_balance numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  factory_price numeric NOT NULL DEFAULT 0,
  customer_price numeric NOT NULL DEFAULT 0,
  delivery_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  total_amount numeric NOT NULL DEFAULT 0,
  payment_method payment_method NOT NULL,
  status sale_status NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  quantity integer NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  amount numeric NOT NULL DEFAULT 0,
  payment_method payment_method NOT NULL,
  payment_date timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
DO $$ 
BEGIN
  ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
  ALTER TABLE products ENABLE ROW LEVEL SECURITY;
  ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
  ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN others THEN null;
END $$;

-- Create policies if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access for authenticated users' AND tablename = 'customers') THEN
    CREATE POLICY "Enable read access for authenticated users" ON customers FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access for authenticated users' AND tablename = 'products') THEN
    CREATE POLICY "Enable read access for authenticated users" ON products FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access for authenticated users' AND tablename = 'sales') THEN
    CREATE POLICY "Enable read access for authenticated users" ON sales FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access for authenticated users' AND tablename = 'sale_items') THEN
    CREATE POLICY "Enable read access for authenticated users" ON sale_items FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access for authenticated users' AND tablename = 'payments') THEN
    CREATE POLICY "Enable read access for authenticated users" ON payments FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Create indexes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customers_type') THEN
    CREATE INDEX idx_customers_type ON customers(type);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sales_customer_id') THEN
    CREATE INDEX idx_sales_customer_id ON sales(customer_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sale_items_sale_id') THEN
    CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_payments_customer_id') THEN
    CREATE INDEX idx_payments_customer_id ON payments(customer_id);
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

-- Create triggers if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_customers_updated_at') THEN
    CREATE TRIGGER update_customers_updated_at
        BEFORE UPDATE ON customers
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_products_updated_at') THEN
    CREATE TRIGGER update_products_updated_at
        BEFORE UPDATE ON products
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sales_updated_at') THEN
    CREATE TRIGGER update_sales_updated_at
        BEFORE UPDATE ON sales
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;