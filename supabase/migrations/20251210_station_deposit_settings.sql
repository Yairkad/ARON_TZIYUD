-- Add deposit settings per station
-- Each station can configure their own deposit amount and payment methods

ALTER TABLE wheel_stations
ADD COLUMN IF NOT EXISTS deposit_amount INTEGER DEFAULT 200,
ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '{"cash": true, "id_deposit": true, "license_deposit": true}'::jsonb;

-- payment_methods structure:
-- {
--   "cash": true/false,
--   "bit": { "enabled": true, "phone": "050-1234567" },
--   "paybox": { "enabled": true, "phone": "050-1234567" },
--   "bank_transfer": { "enabled": true, "details": "בנק לאומי..." },
--   "id_deposit": true/false,
--   "license_deposit": true/false
-- }

-- Add comment for documentation
COMMENT ON COLUMN wheel_stations.deposit_amount IS 'Required deposit amount in ILS for borrowing wheels';
COMMENT ON COLUMN wheel_stations.payment_methods IS 'JSON object with enabled payment methods and their details';
