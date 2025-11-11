-- Add manager_role field to users table to differentiate manager1 vs manager2
-- This allows us to have 2 managers per city with individual authentication

-- Step 1: Add manager_role column
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS manager_role TEXT CHECK (manager_role IN ('manager1', 'manager2'));

-- Step 2: Update constraint to allow managers without manager_role specified (for backward compatibility)
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS city_manager_has_city;

ALTER TABLE public.users
ADD CONSTRAINT city_manager_has_city CHECK (
  (role = 'super_admin' AND city_id IS NULL AND manager_role IS NULL) OR
  (role = 'city_manager' AND city_id IS NOT NULL)
);

-- Step 3: Add unique constraint - only one manager1 and one manager2 per city
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_city_manager_role
ON public.users(city_id, manager_role)
WHERE role = 'city_manager' AND manager_role IS NOT NULL;

-- Step 4: Add phone column if it doesn't exist (might already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'users' AND column_name = 'phone') THEN
    ALTER TABLE public.users ADD COLUMN phone TEXT;
  END IF;
END $$;

COMMENT ON COLUMN public.users.manager_role IS 'For city managers: manager1 or manager2. NULL for super_admin or legacy managers.';
COMMENT ON INDEX idx_unique_city_manager_role IS 'Ensures each city has at most one manager1 and one manager2';
