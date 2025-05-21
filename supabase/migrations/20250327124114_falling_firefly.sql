-- Drop and recreate foreign key constraints with explicit names
ALTER TABLE factory_stock
  DROP CONSTRAINT IF EXISTS factory_stock_product_id_fkey,
  ADD CONSTRAINT factory_stock_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE CASCADE;

ALTER TABLE godown_stock
  DROP CONSTRAINT IF EXISTS godown_stock_product_id_fkey,
  ADD CONSTRAINT godown_stock_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE CASCADE;

ALTER TABLE daily_production
  DROP CONSTRAINT IF EXISTS daily_production_product_id_fkey,
  ADD CONSTRAINT daily_production_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE CASCADE;

-- Ensure product_id columns are NOT NULL
ALTER TABLE factory_stock
  ALTER COLUMN product_id SET NOT NULL;

ALTER TABLE godown_stock
  ALTER COLUMN product_id SET NOT NULL;

ALTER TABLE daily_production
  ALTER COLUMN product_id SET NOT NULL;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Reinitialize stock records for existing products
INSERT INTO factory_stock (product_id, quantity)
SELECT id, 0
FROM products
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO godown_stock (product_id, quantity)
SELECT id, 0
FROM products
ON CONFLICT (product_id) DO NOTHING;