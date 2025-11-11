-- בדיקה בטוחה של בסיס הנתונים

-- 1. בדיקת כל הטבלאות שקיימות
SELECT
  tablename as table_name,
  schemaname as schema
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. בדיקת ערים
SELECT COUNT(*) as total_cities,
       COUNT(CASE WHEN is_active THEN 1 END) as active_cities
FROM cities;

-- 3. בדיקת ציוד
SELECT COUNT(*) as total_equipment FROM equipment;

-- 4. בדיקת היסטוריית השאלות
SELECT COUNT(*) as total_borrow_history FROM borrow_history;

-- 5. בדיקת בקשות
SELECT COUNT(*) as total_requests FROM equipment_requests;

-- 6. הצג את כל הערים
SELECT id, name, is_active,
       CASE WHEN lat IS NOT NULL THEN '✅' ELSE '❌' END as has_coords
FROM cities
ORDER BY name;

-- 7. הצג דוגמת ציוד לעיר אחת (בית שמש)
SELECT e.id, e.name, e.quantity, c.name as city_name
FROM equipment e
JOIN cities c ON e.city_id = c.id
WHERE c.name LIKE '%בית שמש%'
LIMIT 5;
