-- Add public location fields for approximate cabinet locations on map
-- These fields store approximate locations (within ~750m) for display to regular users
-- The exact lat/lng fields remain for authorized token holders

ALTER TABLE public.cities
  ADD COLUMN IF NOT EXISTS public_lat DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS public_lng DECIMAL(11, 8);

COMMENT ON COLUMN public.cities.public_lat IS 'Approximate latitude for map display to regular users (~750m accuracy)';
COMMENT ON COLUMN public.cities.public_lng IS 'Approximate longitude for map display to regular users (~750m accuracy)';
