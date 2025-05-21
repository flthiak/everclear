/*
  Migration to update customer_type ENUM from 'counter' to 'quick'
  
  This migration:
  1. Creates a new customer_type ENUM with 'quick' instead of 'counter'
  2. Updates existing records with type 'counter' to 'quick'
  3. Updates the column type to use the new ENUM
*/

-- Create a temporary type
CREATE TYPE customer_type_new AS ENUM ('customer', 'distributor', 'quick');

-- Update existing records
ALTER TABLE customers
  ALTER COLUMN type TYPE TEXT;

UPDATE customers 
SET type = 'quick' 
WHERE type = 'counter';

-- Change the column type to use the new enum
ALTER TABLE customers
  ALTER COLUMN type TYPE customer_type_new USING type::customer_type_new;

-- Drop the old type and rename the new one
DROP TYPE customer_type;
ALTER TYPE customer_type_new RENAME TO customer_type; 