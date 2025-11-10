-- Create push_subscriptions table for Web Push Notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint to prevent duplicate subscriptions
  UNIQUE(city_id, endpoint)
);

-- Create index for faster lookups by city
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_city_id ON push_subscriptions(city_id);

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
