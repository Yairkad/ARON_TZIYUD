-- Add temporary unavailable fields to wheels table
-- Allows managers to temporarily mark wheels as unavailable (for maintenance, repair, etc.)

ALTER TABLE wheels
ADD COLUMN IF NOT EXISTS temporarily_unavailable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS unavailable_reason TEXT,
ADD COLUMN IF NOT EXISTS unavailable_notes TEXT,
ADD COLUMN IF NOT EXISTS unavailable_since TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS unavailable_by_manager_id UUID;

-- Add index for filtering temporarily unavailable wheels
CREATE INDEX IF NOT EXISTS idx_wheels_temp_unavailable
  ON wheels(temporarily_unavailable)
  WHERE temporarily_unavailable = true;

-- Add comments
COMMENT ON COLUMN wheels.temporarily_unavailable IS 'Whether the wheel is temporarily unavailable for lending (e.g., maintenance, repair)';
COMMENT ON COLUMN wheels.unavailable_reason IS 'Reason for temporary unavailability: maintenance, repair, damaged, other';
COMMENT ON COLUMN wheels.unavailable_notes IS 'Optional notes about the unavailability';
COMMENT ON COLUMN wheels.unavailable_since IS 'Timestamp when the wheel was marked as unavailable';
COMMENT ON COLUMN wheels.unavailable_by_manager_id IS 'ID of the manager who marked it unavailable';
