-- Fix handle_new_user trigger to sync all user_metadata fields (SAFE VERSION)
-- Run this in Supabase SQL Editor
-- This version handles NULL values better and won't crash if enums don't match

-- Drop and recreate the function with all fields and NULL handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to insert with explicit NULL handling for optional fields
  INSERT INTO public.users (
    id,
    email,
    role,
    city_id,
    full_name,
    phone,
    permissions,
    manager_role,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    -- role: default to 'city_manager' if not provided
    COALESCE(
      CASE
        WHEN NEW.raw_user_meta_data->>'role' IN ('city_manager', 'super_admin')
        THEN (NEW.raw_user_meta_data->>'role')::user_role
        ELSE 'city_manager'::user_role
      END,
      'city_manager'::user_role
    ),
    -- city_id: can be NULL for super_admin
    CASE
      WHEN NEW.raw_user_meta_data->>'city_id' IS NOT NULL
      THEN (NEW.raw_user_meta_data->>'city_id')::UUID
      ELSE NULL
    END,
    -- full_name: default to email if not provided
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    -- phone: can be NULL
    NEW.raw_user_meta_data->>'phone',
    -- permissions: default to 'full_access' if not provided
    COALESCE(
      CASE
        WHEN NEW.raw_user_meta_data->>'permissions' IN ('view_only', 'approve_requests', 'full_access')
        THEN (NEW.raw_user_meta_data->>'permissions')::permission_level
        ELSE 'full_access'::permission_level
      END,
      'full_access'::permission_level
    ),
    -- manager_role: can be NULL, only set if valid value provided
    CASE
      WHEN NEW.raw_user_meta_data->>'manager_role' IN ('manager1', 'manager2')
      THEN (NEW.raw_user_meta_data->>'manager_role')::manager_role_type
      ELSE NULL
    END,
    -- is_active: default to true
    true
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation in Auth
    RAISE WARNING 'Error in handle_new_user trigger: %, User ID: %', SQLERRM, NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The trigger already exists, no need to recreate it
-- It will automatically use the new function definition
