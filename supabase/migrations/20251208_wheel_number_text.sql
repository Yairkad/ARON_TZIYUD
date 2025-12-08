-- Change wheel_number from INTEGER to TEXT to allow alphanumeric values like "A23"
ALTER TABLE public.wheels
ALTER COLUMN wheel_number TYPE TEXT USING wheel_number::TEXT;

-- Update the comment
COMMENT ON COLUMN public.wheels.wheel_number IS 'The identifier (e.g., "10", "A23", "B5")';
