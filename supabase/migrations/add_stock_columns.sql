-- Add factory_stock and godown_stock columns to raw_materials table
ALTER TABLE raw_materials 
ADD COLUMN IF NOT EXISTS factory_stock INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS godown_stock INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS product_name TEXT;

-- Update existing records to evenly split the current inventory between factory and godown
UPDATE raw_materials
SET 
  factory_stock = FLOOR(available_quantity / 2),
  godown_stock = CEILING(available_quantity / 2)
WHERE factory_stock = 0 AND godown_stock = 0;

-- Add sample product_name for existing records
UPDATE raw_materials
SET product_name = 
  CASE
    WHEN material = 'Preform' THEN CONCAT('Bottle ', type)
    WHEN material = 'Caps' THEN CONCAT(type, ' Cap')
    WHEN material = 'Labels' THEN CONCAT(type, ' Label')
    WHEN material = 'LD Shrink' THEN CONCAT(type, ' Shrink Wrap')
    ELSE CONCAT(material, ' ', type)
  END
WHERE product_name IS NULL;

-- Create an index on available_quantity to help with low stock queries
CREATE INDEX IF NOT EXISTS idx_raw_materials_available_quantity 
ON raw_materials(available_quantity); 