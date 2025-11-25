-- Check if all required enums exist in Supabase
-- Run this in Supabase SQL Editor to see what enums you have

-- Check user_role enum
SELECT
  'user_role' as enum_name,
  unnest(enum_range(NULL::user_role))::text as enum_values
UNION ALL
-- Check permission_level enum
SELECT
  'permission_level' as enum_name,
  unnest(enum_range(NULL::permission_level))::text as enum_values
UNION ALL
-- Check manager_role_type enum
SELECT
  'manager_role_type' as enum_name,
  unnest(enum_range(NULL::manager_role_type))::text as enum_values
ORDER BY enum_name, enum_values;
