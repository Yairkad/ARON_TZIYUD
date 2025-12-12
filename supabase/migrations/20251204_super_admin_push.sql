-- Add is_super_admin column to push_subscriptions table
ALTER TABLE push_subscriptions
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- Create index for super admin subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_super_admin
ON push_subscriptions (is_super_admin, is_active)
WHERE is_super_admin = TRUE AND is_active = TRUE;
