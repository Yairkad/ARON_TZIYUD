-- Fix missing city_id in existing borrow_history records
-- This script populates city_id based on equipment_id

-- Update borrow_history records that are missing city_id
UPDATE borrow_history
SET city_id = equipment.city_id
FROM equipment
WHERE borrow_history.equipment_id = equipment.id
  AND borrow_history.city_id IS NULL;

-- Verify the update
SELECT
    COUNT(*) AS total_records,
    COUNT(city_id) AS records_with_city_id,
    COUNT(*) - COUNT(city_id) AS records_missing_city_id
FROM borrow_history;

-- Show any remaining records without city_id
SELECT * FROM borrow_history WHERE city_id IS NULL LIMIT 10;
