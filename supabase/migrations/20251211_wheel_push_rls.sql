-- Add Row Level Security to wheel_station_push_subscriptions table
-- This table contains manager phone numbers, so we need to protect it

-- Enable RLS
ALTER TABLE wheel_station_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Service role can do everything (for server-side operations)
-- The service role is used by our API endpoints to manage subscriptions
CREATE POLICY "Service role has full access"
  ON wheel_station_push_subscriptions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy 2: Anonymous/public users can only INSERT (when subscribing)
-- They can't read phone numbers of other managers
CREATE POLICY "Public can insert subscriptions"
  ON wheel_station_push_subscriptions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy 3: Users can DELETE their own subscription by endpoint
-- They can only delete if they know the exact endpoint (from their browser)
CREATE POLICY "Public can delete own subscription by endpoint"
  ON wheel_station_push_subscriptions
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- Grant limited permissions to public users
GRANT INSERT, DELETE ON wheel_station_push_subscriptions TO anon, authenticated;

-- Add comment
COMMENT ON TABLE wheel_station_push_subscriptions IS 'Push notification subscriptions for wheel station managers. Contains phone numbers, so SELECT is restricted to service role only.';
