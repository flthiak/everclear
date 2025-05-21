/*
  # Initial Database Schema

  1. New Tables
    - customers
      - id (uuid, primary key)
      - type (enum: customer, distributor, counter)
      - name (text)
      - phone (text)
      - address (text)
      - credit_limit (numeric)
      - current_balance (numeric)
      - created_at (timestamp)
      - updated_at (timestamp)

    - products
      - id (uuid, primary key)
      - name (text)
      - type (text)
      - factory_price (numeric)
      - customer_price (numeric)
      - delivery_price (numeric)
      - created_at (timestamp)
      - updated_at (timestamp)

    - sales
      - id (uuid, primary key)
      - customer_id (uuid, foreign key)
      - total_amount (numeric)
      - payment_method (enum: cash, credit)
      - status (enum: pending, completed, cancelled)
      - created_at (timestamp)
      - updated_at (timestamp)

    - sale_items
      - id (uuid, primary key)
      - sale_id (uuid, foreign key)
      - product_id (uuid, foreign key)
      - quantity (integer)
      - unit_price (numeric)
      - total_price (numeric)
      - created_at (timestamp)

    - payments
      - id (uuid, primary key)
      - customer_id (uuid, foreign key)
      - amount (numeric)
      - payment_method (enum: cash, credit)
      - payment_date (timestamp)
      - notes (text)
      - created_at (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create custom types
CREATE TYPE customer_type AS ENUM ('customer', 'distributor', 'counter');
CREATE TYPE payment_method AS ENUM ('cash', 'credit');
CREATE TYPE sale_status AS ENUM ('pending', 'completed', 'cancelled');

-- Create customers table
CREATE TABLE customers (
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

-- Create products table
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  factory_price numeric NOT NULL DEFAULT 0,
  customer_price numeric NOT NULL DEFAULT 0,
  delivery_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sales table
CREATE TABLE sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  total_amount numeric NOT NULL DEFAULT 0,
  payment_method payment_method NOT NULL,
  status sale_status NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sale_items table
CREATE TABLE sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  quantity integer NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  amount numeric NOT NULL DEFAULT 0,
  payment_method payment_method NOT NULL,
  payment_date timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users" ON customers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON sales
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON sale_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON payments
  FOR SELECT TO authenticated USING (true);

-- Create indexes for better performance
CREATE INDEX idx_customers_type ON customers(type);
CREATE INDEX idx_sales_customer_id ON sales(customer_id);
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();