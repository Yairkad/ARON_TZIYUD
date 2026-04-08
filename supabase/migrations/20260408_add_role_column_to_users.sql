-- ============================================================================
-- Migration: Add role column to users table if missing
-- Created: 2026-04-08
-- Description: The users.role column is required by is_super_admin() and other
--              helper functions used in RLS policies. Without it, ALL queries
--              to tables with these policies fail (including public cabinets map).
-- ============================================================================

-- Step 1: Create ENUM type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('city_manager', 'super_admin');
  END IF;
END $$;

-- Step 2: Create user_permission ENUM type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_permission') THEN
    CREATE TYPE user_permission AS ENUM ('view_only', 'approve_requests', 'full_access');
  END IF;
END $$;

-- Step 3: Add role column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'role'
  ) THEN
    ALTER TABLE public.users
      ADD COLUMN role user_role NOT NULL DEFAULT 'city_manager';

    -- Create index for the new column
    CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
  END IF;
END $$;

-- Step 4: Add permissions column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'permissions'
  ) THEN
    ALTER TABLE public.users
      ADD COLUMN permissions user_permission NOT NULL DEFAULT 'full_access';
  END IF;
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================
