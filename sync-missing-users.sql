-- Sync all users from auth.users to public.users
-- Run this in Supabase SQL Editor to fix missing users

-- This will create all missing users in public.users
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  city_id,
  permissions,
  phone,
  manager_role,
  is_active
)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) AS full_name,
  CASE
    WHEN au.raw_user_meta_data->>'role' IN ('city_manager', 'super_admin')
    THEN (au.raw_user_meta_data->>'role')::user_role
    ELSE 'city_manager'::user_role
  END AS role,
  CASE
    WHEN au.raw_user_meta_data->>'city_id' IS NOT NULL
    THEN (au.raw_user_meta_data->>'city_id')::uuid
    ELSE NULL
  END AS city_id,
  CASE
    WHEN au.raw_user_meta_data->>'permissions' IN ('view_only', 'approve_requests', 'full_access')
    THEN (au.raw_user_meta_data->>'permissions')::user_permission
    ELSE 'full_access'::user_permission
  END AS permissions,
  au.raw_user_meta_data->>'phone' AS phone,
  CASE
    WHEN au.raw_user_meta_data->>'manager_role' IN ('manager1', 'manager2')
    THEN (au.raw_user_meta_data->>'manager_role')::manager_role_type
    ELSE NULL
  END AS manager_role,
  true AS is_active
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
  AND au.email IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Show how many users were synced
SELECT COUNT(*) AS synced_users
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NOT NULL
  AND au.email IS NOT NULL;
