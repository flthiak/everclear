-- Add product_name and product_sn columns to godown_stock table
ALTER TABLE godown_stock ADD COLUMN product_name text NOT NULL DEFAULT '';
ALTER TABLE godown_stock ADD COLUMN product_sn text NOT NULL DEFAULT '';

-- Create or refresh the trigger function to copy product_name when inserting or updating
CREATE OR REPLACE FUNCTION sync_godown_stock_product_name()
RETURNS TRIGGER AS $$
BEGIN
    -- Get the product name from the products table
    SELECT product_name, product_id 
    INTO NEW.product_name, NEW.product_sn
    FROM products
    WHERE id = NEW.product_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set product_name when a record is inserted
DROP TRIGGER IF EXISTS set_godown_stock_product_name ON godown_stock;
CREATE TRIGGER set_godown_stock_product_name
BEFORE INSERT OR UPDATE ON godown_stock
FOR EACH ROW
EXECUTE FUNCTION sync_godown_stock_product_name();

-- Update existing records
UPDATE godown_stock
SET product_name = p.product_name,
    product_sn = p.product_id
FROM products p
WHERE godown_stock.product_id = p.id;


