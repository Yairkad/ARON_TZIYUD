-- Create push_subscriptions table for Web Push Notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_city_id ON push_subscriptions(city_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_is_active ON push_subscriptions(is_active);

-- Add RLS policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: City managers can view their own subscriptions
CREATE POLICY "City managers can view their own push subscriptions"
  ON push_subscriptions
  FOR SELECT
  USING (true);

-- Policy: City managers can insert their own subscriptions
CREATE POLICY "City managers can insert their own push subscriptions"
  ON push_subscriptions
  FOR INSERT
  WITH CHECK (true);

-- Policy: City managers can delete their own subscriptions
CREATE POLICY "City managers can delete their own push subscriptions"
  ON push_subscriptions
  FOR DELETE
  USING (true);

-- Add comment
COMMENT ON TABLE push_subscriptions IS 'Stores Web Push Notification subscriptions for city managers';
