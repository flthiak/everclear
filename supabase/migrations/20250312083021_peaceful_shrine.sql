/*
  # Add Sample Products

  1. Changes
    - Insert initial product data for different bottle sizes
    - Each product includes:
      - Name
      - Type
      - Factory price
      - Customer price 
      - Delivery price

  2. Products Added
    - 250ml bottles
    - 500ml bottles
    - 1000ml bottles
    - Labels for each size
    - Caps and other materials
*/

-- Insert sample products if they don't exist
DO $$ 
BEGIN
  -- Bottles
  IF NOT EXISTS (SELECT 1 FROM products WHERE name = '250ml Bottle') THEN
    INSERT INTO products (name, type, factory_price, customer_price, delivery_price)
    VALUES
      ('250ml Bottle', 'bottle', 8.00, 10.00, 12.00);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM products WHERE name = '500ml Bottle') THEN
    INSERT INTO products (name, type, factory_price, customer_price, delivery_price)
    VALUES
      ('500ml Bottle', 'bottle', 12.00, 15.00, 18.00);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM products WHERE name = '1000ml Bottle') THEN
    INSERT INTO products (name, type, factory_price, customer_price, delivery_price)
    VALUES
      ('1000ml Bottle', 'bottle', 16.00, 20.00, 24.00);
  END IF;

  -- Labels
  IF NOT EXISTS (SELECT 1 FROM products WHERE name = '250ml Label') THEN
    INSERT INTO products (name, type, factory_price, customer_price, delivery_price)
    VALUES
      ('250ml Label', 'label', 0.35, 0.50, 0.60);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM products WHERE name = '500ml Label') THEN
    INSERT INTO products (name, type, factory_price, customer_price, delivery_price)
    VALUES
      ('500ml Label', 'label', 0.45, 0.60, 0.75);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM products WHERE name = '1000ml Label') THEN
    INSERT INTO products (name, type, factory_price, customer_price, delivery_price)
    VALUES
      ('1000ml Label', 'label', 0.55, 0.70, 0.85);
  END IF;

  -- Other Materials
  IF NOT EXISTS (SELECT 1 FROM products WHERE name = 'Bottle Cap') THEN
    INSERT INTO products (name, type, factory_price, customer_price, delivery_price)
    VALUES
      ('Bottle Cap', 'cap', 0.25, 0.35, 0.40);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM products WHERE name = 'Shrink Wrap') THEN
    INSERT INTO products (name, type, factory_price, customer_price, delivery_price)
    VALUES
      ('Shrink Wrap', 'packaging', 15.00, 18.00, 20.00);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM products WHERE name = 'Box (24 bottles)') THEN
    INSERT INTO products (name, type, factory_price, customer_price, delivery_price)
    VALUES
      ('Box (24 bottles)', 'packaging', 5.00, 6.00, 7.00);
  END IF;
END $$;