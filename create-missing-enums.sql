-- Create missing enums for user management
-- Run this in Supabase SQL Editor

-- Create permission_level enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE permission_level AS ENUM ('view_only', 'approve_requests', 'full_access');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create manager_role_type enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE manager_role_type AS ENUM ('manager1', 'manager2');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Verify the enums were created
SELECT 'permission_level' as enum_name, unnest(enum_range(NULL::permission_level))::text as enum_values
UNION ALL
SELECT 'manager_role_type' as enum_name, unnest(enum_range(NULL::manager_role_type))::text as enum_values
ORDER BY enum_name, enum_values;
