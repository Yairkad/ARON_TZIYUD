-- Add signature and additional borrower fields to wheel_borrows table
-- These fields support the new public sign form workflow

-- Add borrower ID number
ALTER TABLE public.wheel_borrows ADD COLUMN IF NOT EXISTS borrower_id_number TEXT;

-- Add borrower address
ALTER TABLE public.wheel_borrows ADD COLUMN IF NOT EXISTS borrower_address TEXT;

-- Add vehicle model
ALTER TABLE public.wheel_borrows ADD COLUMN IF NOT EXISTS vehicle_model TEXT;

-- Add digital signature (base64 image data)
ALTER TABLE public.wheel_borrows ADD COLUMN IF NOT EXISTS signature_data TEXT;

-- Add signature timestamp
ALTER TABLE public.wheel_borrows ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

-- Add terms accepted flag
ALTER TABLE public.wheel_borrows ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE;

-- Create index for unsigned borrows (for tracking)
CREATE INDEX IF NOT EXISTS idx_wheel_borrows_unsigned ON public.wheel_borrows(station_id) WHERE signature_data IS NULL AND status = 'borrowed';
