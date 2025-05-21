-- Create sequence for product IDs starting from 1
CREATE SEQUENCE IF NOT EXISTS product_id_seq START WITH 1;

-- Drop existing product_item column
ALTER TABLE products DROP COLUMN IF EXISTS product_item;

-- Add new product_id column
ALTER TABLE products 
ADD COLUMN product_id text GENERATED ALWAYS AS (
  LPAD(NEXTVAL('product_id_seq')::text, 3, '0')
) STORED;

-- Create unique index on product_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_product_id ON products(product_id);

-- Reset sequence to max value if products exist
DO $$
DECLARE
  max_id integer;
BEGIN
  SELECT COALESCE(MAX(CAST(product_id AS integer)), 0)
  INTO max_id
  FROM products;
  
  IF max_id > 0 THEN
    PERFORM setval('product_id_seq', max_id);
  END IF;
END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';