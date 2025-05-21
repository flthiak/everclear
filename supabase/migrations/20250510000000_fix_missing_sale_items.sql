-- Function to fix sales without associated items
CREATE OR REPLACE FUNCTION fix_missing_sale_items()
RETURNS integer AS $$
DECLARE
    sales_fixed integer := 0;
    sale_record RECORD;
    default_product_id uuid;
BEGIN
    -- Get a default water product ID to use for missing items
    SELECT id INTO default_product_id FROM products WHERE product_name ILIKE '%water%' LIMIT 1;
    
    -- If no water product found, try to get any product
    IF default_product_id IS NULL THEN
        SELECT id INTO default_product_id FROM products LIMIT 1;
    END IF;
    
    -- Exit if no products available
    IF default_product_id IS NULL THEN
        RAISE NOTICE 'No products available to use as default';
        RETURN 0;
    END IF;
    
    -- Find sales that don't have any items in sale_items table
    FOR sale_record IN 
        SELECT s.id, s.total_amount 
        FROM sales s
        WHERE s.id NOT IN (SELECT DISTINCT sale_id FROM sale_items)
        AND s.total_amount > 0
    LOOP
        -- Create a placeholder item for this sale
        INSERT INTO sale_items (
            sale_id,
            product_id,
            quantity,
            unit_price,
            total_price
        ) VALUES (
            sale_record.id,
            default_product_id,
            1,
            sale_record.total_amount,
            sale_record.total_amount
        );
        
        sales_fixed := sales_fixed + 1;
        RAISE NOTICE 'Fixed sale %: Added placeholder item with total amount %', 
                     sale_record.id, sale_record.total_amount;
    END LOOP;
    
    RETURN sales_fixed;
END;
$$ LANGUAGE plpgsql;

-- Run the function to fix existing sales without items
SELECT fix_missing_sale_items();

-- Create a trigger function to ensure new sales always have an item
CREATE OR REPLACE FUNCTION ensure_sale_has_items()
RETURNS TRIGGER AS $$
DECLARE
    item_count integer;
    default_product_id uuid;
BEGIN
    -- Check if this sale has any items
    SELECT COUNT(*) INTO item_count FROM sale_items WHERE sale_id = NEW.id;
    
    -- If no items found for this sale after 5 seconds, add a placeholder
    IF item_count = 0 THEN
        -- Get a default water product to use
        SELECT id INTO default_product_id FROM products WHERE product_name ILIKE '%water%' LIMIT 1;
        
        -- If no water product found, try to get any product
        IF default_product_id IS NULL THEN
            SELECT id INTO default_product_id FROM products LIMIT 1;
        END IF;
        
        -- Only proceed if we have a product to use
        IF default_product_id IS NOT NULL THEN
            -- Create a placeholder item for this sale
            INSERT INTO sale_items (
                sale_id,
                product_id,
                quantity,
                unit_price,
                total_price
            ) VALUES (
                NEW.id,
                default_product_id,
                1,
                NEW.total_amount,
                NEW.total_amount
            );
            
            RAISE NOTICE 'Added placeholder item for new sale %', NEW.id;
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger that runs after a sale is inserted or updated
CREATE TRIGGER sale_ensure_items_trigger
AFTER INSERT OR UPDATE ON sales
FOR EACH ROW
EXECUTE FUNCTION ensure_sale_has_items();

-- Grant necessary privileges
GRANT EXECUTE ON FUNCTION fix_missing_sale_items() TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_sale_has_items() TO authenticated; 