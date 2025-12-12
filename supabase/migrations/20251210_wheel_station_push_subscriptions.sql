-- Create push subscriptions table for wheel station managers
-- These managers don't use Supabase auth, so we link by station_id + manager_phone

CREATE TABLE IF NOT EXISTS wheel_station_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id UUID NOT NULL REFERENCES wheel_stations(id) ON DELETE CASCADE,
  manager_phone TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_wheel_push_station_id ON wheel_station_push_subscriptions(station_id);
CREATE INDEX IF NOT EXISTS idx_wheel_push_active ON wheel_station_push_subscriptions(is_active) WHERE is_active = true;

-- Comments
COMMENT ON TABLE wheel_station_push_subscriptions IS 'Push notification subscriptions for wheel station managers';
COMMENT ON COLUMN wheel_station_push_subscriptions.station_id IS 'The wheel station this subscription is for';
COMMENT ON COLUMN wheel_station_push_subscriptions.manager_phone IS 'Phone number of the manager who subscribed';
COMMENT ON COLUMN wheel_station_push_subscriptions.endpoint IS 'Push service endpoint URL';
