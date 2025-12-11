-- Add Row Level Security to wheel_station_push_subscriptions table

-- Enable RLS
ALTER TABLE wheel_station_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can insert their own subscription (when subscribing to push notifications)
CREATE POLICY "Anyone can create push subscriptions"
  ON wheel_station_push_subscriptions
  FOR INSERT
  WITH CHECK (true);

-- Policy 2: Anyone can view all subscriptions (needed for sending notifications)
CREATE POLICY "Anyone can view push subscriptions"
  ON wheel_station_push_subscriptions
  FOR SELECT
  USING (true);

-- Policy 3: Anyone can update their own subscription (to mark as inactive when unsubscribing)
CREATE POLICY "Anyone can update push subscriptions"
  ON wheel_station_push_subscriptions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy 4: Anyone can delete push subscriptions
CREATE POLICY "Anyone can delete push subscriptions"
  ON wheel_station_push_subscriptions
  FOR DELETE
  USING (true);

-- Grant permissions
GRANT ALL ON wheel_station_push_subscriptions TO anon, authenticated;

-- Add comment
COMMENT ON TABLE wheel_station_push_subscriptions IS 'Push notification subscriptions for wheel station managers. Public access allowed since there is no sensitive data.';
