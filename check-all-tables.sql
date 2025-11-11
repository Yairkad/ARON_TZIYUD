-- בדיקה של כל הטבלאות שקיימות בבסיס הנתונים

-- 1. רשימת כל הטבלאות ב-schema public
SELECT
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. אם אין טבלאות, בדוק אם יש schemas אחרים
SELECT DISTINCT table_schema
FROM information_schema.tables
ORDER BY table_schema;

-- 3. בדוק אם יש טבלאות בכלל
SELECT COUNT(*) as total_tables
FROM information_schema.tables
WHERE table_type = 'BASE TABLE';
