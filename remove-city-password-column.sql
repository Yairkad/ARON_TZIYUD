-- Remove the password column from cities table
-- Run this in Supabase SQL Editor

-- Option 1: Remove the column entirely (RECOMMENDED)
-- This removes the password field since we now use separate user management
ALTER TABLE public.cities DROP COLUMN IF EXISTS password;

-- If you prefer to keep the column but make it optional:
-- ALTER TABLE public.cities ALTER COLUMN password DROP NOT NULL;
-- ALTER TABLE public.cities ALTER COLUMN password SET DEFAULT NULL;
