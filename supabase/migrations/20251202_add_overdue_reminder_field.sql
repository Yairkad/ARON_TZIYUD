-- Migration: Add last_reminder_sent_at field to borrow_history
-- This tracks when the last overdue reminder was sent to avoid spamming borrowers

ALTER TABLE borrow_history
ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for efficient querying of overdue items
CREATE INDEX IF NOT EXISTS idx_borrow_history_overdue
ON borrow_history (status, borrow_date)
WHERE status = 'borrowed';

-- Comment
COMMENT ON COLUMN borrow_history.last_reminder_sent_at IS 'Timestamp of last overdue reminder sent to borrower';
