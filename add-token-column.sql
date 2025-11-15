-- Add token column to equipment_requests table
-- This stores the original token for sharing with requesters
-- The token_hash is used for verification when accessing the request

ALTER TABLE equipment_requests ADD COLUMN IF NOT EXISTS token TEXT;

-- For existing records, we cannot recover the original tokens
-- They will need to be regenerated if managers need to share them
