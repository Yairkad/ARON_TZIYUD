-- Find and fix triggers/functions that reference user_name column

-- Step 1: Find all triggers on borrow_history table
SELECT
    t.tgname AS trigger_name,
    p.proname AS function_name,
    pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'borrow_history'::regclass
  AND NOT t.tgisinternal;

-- Step 2: Find functions that might reference user_name
-- (Skip this step if you want to go directly to the fix)

-- Step 3: Drop any old update_updated_at trigger if it references user_name
-- (We'll recreate it correctly)
DROP TRIGGER IF EXISTS update_borrow_history_updated_at ON borrow_history;

-- Step 4: Drop the old function if it exists
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Step 5: Recreate the trigger function correctly (without user_name reference)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Recreate the trigger on borrow_history
CREATE TRIGGER update_borrow_history_updated_at
    BEFORE UPDATE ON borrow_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Verify the fix
SELECT
    t.tgname AS trigger_name,
    p.proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'borrow_history'::regclass
  AND NOT t.tgisinternal;
