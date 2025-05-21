-- Update the raw_materials table to ensure preform values are correct
UPDATE raw_materials
SET available_quantity = 10
WHERE material = 'Preform' AND type LIKE '%19.4%';

-- Add a note about correct calculation to the type field
UPDATE raw_materials
SET type = CASE
    WHEN type LIKE '%(%' THEN REGEXP_REPLACE(type, '\([^)]*\)', '(1,288.66 pcs/bag)')
    ELSE type || ' (1,288.66 pcs/bag)'
END
WHERE material = 'Preform' AND type LIKE '%19.4%'; 