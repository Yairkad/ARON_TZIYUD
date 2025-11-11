-- Create Super Admin User via Supabase SQL Editor
-- Copy and paste this entire script into Supabase Dashboard → SQL Editor

-- Step 1: Delete any existing user with this email
DELETE FROM auth.users WHERE email = 'yk74re@gmail.com';
DELETE FROM public.users WHERE email = 'yk74re@gmail.com';

-- Step 2: Create the user using Supabase's proper auth function
-- This ensures password is hashed correctly for Supabase Auth

DO $$
DECLARE
  new_user_id uuid;
  hashed_password text;
BEGIN
  -- Generate a new UUID for the user
  new_user_id := gen_random_uuid();

  -- Use Supabase's password hashing (compatible with Auth API)
  -- We'll use pgcrypto's crypt with a specific format that Supabase accepts
  hashed_password := crypt('Admin2025', gen_salt('bf', 10));

  -- Insert into auth.users with proper Supabase Auth fields
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    'yk74re@gmail.com',
    hashed_password,
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Super Admin","role":"super_admin","permissions":"full_access"}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  -- Insert into public.users (this would normally be done by trigger, but we'll do it manually)
  INSERT INTO public.users (
    id,
    email,
    role,
    full_name,
    permissions,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    'yk74re@gmail.com',
    'super_admin',
    'Super Admin',
    'full_access',
    true,
    NOW(),
    NOW()
  );

  RAISE NOTICE 'User created successfully with ID: %', new_user_id;
  RAISE NOTICE 'Email: yk74re@gmail.com';
  RAISE NOTICE 'Password: Admin2025';
  RAISE NOTICE 'Login at: https://aron-tziyud.vercel.app/super-admin';
END $$;

-- Step 3: Verify the user was created
SELECT
  u.id,
  u.email,
  u.role,
  u.permissions,
  u.is_active,
  u.created_at
FROM public.users u
WHERE u.email = 'yk74re@gmail.com';
