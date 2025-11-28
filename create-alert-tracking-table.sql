-- Create alert_tracking table to track sent reminders
-- This prevents duplicate alerts and enables follow-up reminders

CREATE TABLE IF NOT EXISTS alert_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL, -- 'low_stock', 'faulty_equipment', 'monthly_report'
  reference_id VARCHAR(255), -- equipment_id or other reference
  reference_name VARCHAR(255), -- equipment name for display
  first_alert_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_alert_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  alert_count INTEGER NOT NULL DEFAULT 1,
  resolved_at TIMESTAMPTZ, -- When the issue was resolved (stock refilled, equipment fixed)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX idx_alert_tracking_city_type ON alert_tracking(city_id, alert_type);
CREATE INDEX idx_alert_tracking_unresolved ON alert_tracking(city_id, alert_type, resolved_at) WHERE resolved_at IS NULL;

-- Unique constraint to prevent duplicate active alerts
CREATE UNIQUE INDEX idx_alert_tracking_unique_active ON alert_tracking(city_id, alert_type, reference_id) WHERE resolved_at IS NULL;

-- Add RLS policies
ALTER TABLE alert_tracking ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on alert_tracking" ON alert_tracking
  FOR ALL USING (true);

-- Comment on table
COMMENT ON TABLE alert_tracking IS 'Tracks sent alerts/reminders to prevent duplicates and enable follow-ups';
