-- חיפוש הטבלאות שלנו

-- 1. חפש טבלאות לפי שם
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name IN ('cities', 'equipment', 'borrow_history', 'equipment_requests', 'request_items', 'admin_notifications', 'users')
ORDER BY table_name;

-- 2. חפש טבלאות שמתחילות ב-public
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 3. חפש טבלאות שמכילות את המילה city או equipment
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name LIKE '%cit%'
   OR table_name LIKE '%equip%'
   OR table_name LIKE '%borrow%'
ORDER BY table_name;

-- 4. נסה לגשת ישירות לטבלת cities
SELECT COUNT(*) as cities_count FROM cities;

-- 5. נסה לגשת לטבלת equipment
SELECT COUNT(*) as equipment_count FROM equipment;
