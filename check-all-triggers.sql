-- Check ALL triggers in the database for user_name references

-- Get all triggers and their function definitions
SELECT
    t.tgname AS trigger_name,
    c.relname AS table_name,
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_code
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE NOT t.tgisinternal
  AND c.relname IN ('equipment_requests', 'request_items', 'borrow_history', 'equipment', 'cities')
ORDER BY c.relname, t.tgname;
