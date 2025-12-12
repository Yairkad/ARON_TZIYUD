-- Migration: Update push_subscriptions table to add missing columns
-- Run this if the table already exists

-- Add user_id column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'push_subscriptions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE push_subscriptions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add is_active column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'push_subscriptions' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE push_subscriptions ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Add updated_at column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'push_subscriptions' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE push_subscriptions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Make city_id nullable (since we can find city via user_id)
ALTER TABLE push_subscriptions ALTER COLUMN city_id DROP NOT NULL;

-- Create new indexes if missing
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_is_active ON push_subscriptions(is_active);

-- Update endpoint to be unique (instead of city_id + endpoint)
-- First drop old constraint if exists
ALTER TABLE push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_city_id_endpoint_key;

-- Then ensure endpoint is unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'push_subscriptions_endpoint_key'
  ) THEN
    ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE(endpoint);
  END IF;
EXCEPTION
  WHEN others THEN
    -- Constraint might already exist, ignore
    NULL;
END $$;
