-- Find all references to user_name in the database

-- 1. Check RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'borrow_history';

-- 2. Check views that might use borrow_history
SELECT
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public'
  AND definition ILIKE '%borrow_history%';

-- 3. Check all triggers again
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'borrow_history';

-- 4. List all columns in borrow_history to confirm
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'borrow_history'
ORDER BY ordinal_position;
