-- Add Missing Columns to Cities Table
-- Safe to run multiple times - only adds columns if they don't exist

-- 1. Add request_mode column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cities' AND column_name = 'request_mode'
  ) THEN
    ALTER TABLE cities
    ADD COLUMN request_mode VARCHAR(10) DEFAULT 'direct' CHECK (request_mode IN ('direct', 'request'));

    COMMENT ON COLUMN cities.request_mode IS 'Operation mode: direct (immediate borrowing) or request (requires manager approval)';
  END IF;
END $$;

-- 2. Add cabinet_code column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cities' AND column_name = 'cabinet_code'
  ) THEN
    ALTER TABLE cities
    ADD COLUMN cabinet_code VARCHAR(50);

    COMMENT ON COLUMN cities.cabinet_code IS 'Optional cabinet unlock code shown to approved requesters';
  END IF;
END $$;

-- 3. Add require_call_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cities' AND column_name = 'require_call_id'
  ) THEN
    ALTER TABLE cities
    ADD COLUMN require_call_id BOOLEAN DEFAULT false;

    COMMENT ON COLUMN cities.require_call_id IS 'Whether to require call ID field in requests';
  END IF;
END $$;

-- 4. Add admin_emails column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cities' AND column_name = 'admin_emails'
  ) THEN
    ALTER TABLE cities
    ADD COLUMN admin_emails TEXT[];

    COMMENT ON COLUMN cities.admin_emails IS 'Array of admin email addresses for notifications';
  END IF;
END $$;

-- Success message
SELECT 'All missing columns added successfully!' as result;
