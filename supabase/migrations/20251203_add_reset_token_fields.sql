-- ============================================================================
-- Migration: Add password reset token fields to users table
-- Created: 2025-12-03
-- Description: Adds reset_token and reset_token_expires_at columns for
--              custom password reset flow
-- ============================================================================

-- Add reset token column
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS reset_token TEXT;

-- Add reset token expiry column
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ;

-- Create index for faster token lookup
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON public.users(reset_token)
WHERE reset_token IS NOT NULL;

-- ============================================================================
-- Migration Complete
-- ============================================================================
