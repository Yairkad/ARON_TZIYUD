-- ============================================================================
-- Enable Leaked Password Protection
-- Created: 2026-01-14
-- Description: Enable Supabase Auth password breach detection
-- ============================================================================

-- Note: This setting is configured via Supabase Dashboard, not SQL
-- Go to: Authentication > Settings > Password Protection
-- Enable: "Check passwords against known breaches"

-- This migration serves as documentation that this setting should be enabled.
-- The actual configuration must be done in the Supabase Dashboard under:
-- Authentication > Settings > Security and Protection > Password Protection

-- ============================================================================
-- Alternative: If using Supabase CLI/API, use this command:
-- ============================================================================
-- supabase secrets set GOTRUE_PASSWORD_REQUIRED_CHARACTERS=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789
-- supabase secrets set GOTRUE_PASSWORD_MIN_LENGTH=8
-- supabase secrets set GOTRUE_SECURITY_REFRESH_TOKEN_REUSE_INTERVAL=10
--
-- For leaked password protection specifically, this is managed via Supabase's
-- integration with HaveIBeenPwned API and is enabled in the dashboard.

-- ============================================================================
-- Documentation
-- ============================================================================

-- This file exists to document the security requirement:
-- LEAKED PASSWORD PROTECTION must be enabled in Supabase Auth settings

-- How to enable:
-- 1. Go to Supabase Dashboard
-- 2. Select your project
-- 3. Navigate to Authentication > Settings
-- 4. Under "Security and Protection", enable "Password Protection"
-- 5. Save changes

-- What this does:
-- - Checks new passwords against HaveIBeenPwned database
-- - Prevents users from setting commonly breached passwords
-- - Adds an extra layer of security for user accounts

SELECT 'REMINDER: Enable leaked password protection in Supabase Dashboard' as reminder,
       'Authentication > Settings > Security and Protection > Password Protection' as location;
