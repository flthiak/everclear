/*
  # Combine Sales Tables

  This migration:
  1. Creates a new combined_sales table with all fields from both sales_unified and sale_items
  2. Migrates data from both tables into the new structure
  3. Drops the old tables and renames the new table to sales
*/

-- First, check if sales_unified exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sales_unified') THEN
    -- Create a new table that will contain all the necessary fields
    CREATE TABLE combined_sales (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id uuid REFERENCES customers(id),
      type text,
      payment_method text,
      total_amount numeric NOT NULL DEFAULT 0,
      status text DEFAULT 'completed',
      delivery boolean DEFAULT false,
      
      -- Fields from sale_items
      product_id uuid REFERENCES products(id),
      quantity integer DEFAULT 0,
      price numeric DEFAULT 0,
      
      -- Common fields
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- Create indexes for better performance
    CREATE INDEX idx_combined_sales_customer_id ON combined_sales(customer_id);
    CREATE INDEX idx_combined_sales_product_id ON combined_sales(product_id);
    CREATE INDEX idx_combined_sales_type ON combined_sales(type);
    CREATE INDEX idx_combined_sales_created_at ON combined_sales(created_at);

    -- Enable RLS
    ALTER TABLE combined_sales ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "Enable read access for all users" ON combined_sales
      FOR SELECT USING (true);

    CREATE POLICY "Enable insert for all users" ON combined_sales
      FOR INSERT WITH CHECK (true);

    CREATE POLICY "Enable update for all users" ON combined_sales
      FOR UPDATE USING (true) WITH CHECK (true);

    CREATE POLICY "Enable delete for all users" ON combined_sales
      FOR DELETE USING (true);

    -- Insert data from sales_unified and sale_items
    INSERT INTO combined_sales (
      id, customer_id, type, payment_method, total_amount, status, delivery, 
      product_id, quantity, price, created_at, updated_at
    )
    SELECT 
      si.id, su.customer_id, su.type, su.payment_method, si.total, su.status, 
      su.delivery, si.product_id, si.quantity, si.price, su.created_at, su.updated_at
    FROM sale_items si
    JOIN sales_unified su ON si.sale_id = su.id;

    -- Create trigger for updated_at
    CREATE TRIGGER update_combined_sales_updated_at
        BEFORE UPDATE ON combined_sales
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    -- Drop old tables if the migration was successful
    DROP TABLE IF EXISTS sale_items CASCADE;
    DROP TABLE IF EXISTS sales_unified CASCADE;
    
    -- Rename the new table to sales
    ALTER TABLE combined_sales RENAME TO sales;
  ELSE
    -- If sales_unified doesn't exist but we have separate sales and sale_items tables
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sales') AND
       EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sale_items') THEN
      
      -- Create a new table that will contain all the necessary fields
      CREATE TABLE combined_sales (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id uuid REFERENCES customers(id),
        type text,
        payment_method text,
        total_amount numeric NOT NULL DEFAULT 0,
        status text DEFAULT 'completed',
        delivery boolean DEFAULT false,
        
        -- Fields from sale_items
        product_id uuid REFERENCES products(id),
        quantity integer DEFAULT 0,
        price numeric DEFAULT 0,
        
        -- Common fields
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      -- Create indexes for better performance
      CREATE INDEX idx_combined_sales_customer_id ON combined_sales(customer_id);
      CREATE INDEX idx_combined_sales_product_id ON combined_sales(product_id);
      CREATE INDEX idx_combined_sales_type ON combined_sales(type);
      CREATE INDEX idx_combined_sales_created_at ON combined_sales(created_at);

      -- Enable RLS
      ALTER TABLE combined_sales ENABLE ROW LEVEL SECURITY;

      -- Create policies
      CREATE POLICY "Enable read access for all users" ON combined_sales
        FOR SELECT USING (true);

      CREATE POLICY "Enable insert for all users" ON combined_sales
        FOR INSERT WITH CHECK (true);

      CREATE POLICY "Enable update for all users" ON combined_sales
        FOR UPDATE USING (true) WITH CHECK (true);

      CREATE POLICY "Enable delete for all users" ON combined_sales
        FOR DELETE USING (true);

      -- Insert data from sales and sale_items
      INSERT INTO combined_sales (
        id, customer_id, type, payment_method, total_amount, status,
        product_id, quantity, price, created_at, updated_at
      )
      SELECT 
        si.id, s.customer_id, 
        CASE 
          WHEN c.is_distributor THEN 'distributor'
          ELSE 'customer'
        END as type,
        s.payment_method, si.total, s.status, 
        si.product_id, si.quantity, si.price, s.created_at, s.updated_at
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      LEFT JOIN customers c ON s.customer_id = c.id;

      -- Create trigger for updated_at
      CREATE TRIGGER update_combined_sales_updated_at
          BEFORE UPDATE ON combined_sales
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();

      -- Drop old tables if the migration was successful
      DROP TABLE IF EXISTS sale_items CASCADE;
      DROP TABLE IF EXISTS sales CASCADE;
      
      -- Rename the new table to sales
      ALTER TABLE combined_sales RENAME TO sales;
    END IF;
  END IF;
END $$; 