-- בדיקה מקיפה של כל הטבלאות בבסיס הנתונים

-- 1. בדיקת קיום הטבלאות
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

-- 6. הצג כמה רשומות לדוגמה מכל טבלה
SELECT 'cities' as table_name, COUNT(*) as count FROM cities
UNION ALL
SELECT 'equipment', COUNT(*) FROM equipment
UNION ALL
SELECT 'borrow_history', COUNT(*) FROM borrow_history
UNION ALL
SELECT 'equipment_requests', COUNT(*) FROM equipment_requests
UNION ALL
SELECT 'request_items', COUNT(*) FROM request_items
UNION ALL
SELECT 'admin_notifications', COUNT(*) FROM admin_notifications
UNION ALL
SELECT 'push_subscriptions', COUNT(*) FROM push_subscriptions;

-- 7. הצג את כל הערים עם סטטוס
SELECT id, name, is_active,
       CASE WHEN lat IS NOT NULL THEN '✅' ELSE '❌' END as has_coords
FROM cities
ORDER BY name;
