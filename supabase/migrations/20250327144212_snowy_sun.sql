-- Add product_item column back to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS product_item text GENERATED ALWAYS AS (
  UPPER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '_'),
      '^_+|_+$',
      ''
    )
  )
) STORED;

-- Create index on product_item
CREATE INDEX IF NOT EXISTS idx_products_product_item ON products(product_item);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';