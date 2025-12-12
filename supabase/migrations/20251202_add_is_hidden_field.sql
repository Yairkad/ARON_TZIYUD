-- Migration: Add is_hidden field to borrow_history for soft delete
-- Records marked as hidden won't show in history tab but will still appear in reports

ALTER TABLE borrow_history
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_borrow_history_is_hidden
ON borrow_history (is_hidden)
WHERE is_hidden = false;

-- Comment
COMMENT ON COLUMN borrow_history.is_hidden IS 'When true, record is hidden from history tab but still counted in reports';
