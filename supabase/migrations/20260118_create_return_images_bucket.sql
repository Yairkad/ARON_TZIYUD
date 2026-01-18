-- ============================================================================
-- Create Storage Bucket for Return Images
-- Created: 2026-01-18
-- Description: Creates a public bucket for storing equipment return photos
-- ============================================================================

-- Note: Storage bucket creation must be done via Supabase Dashboard or CLI
-- This migration documents the required configuration

-- Required steps in Supabase Dashboard (Storage section):
-- 1. Create a new bucket named "return-images"
-- 2. Set it as PUBLIC (so images can be viewed without authentication)
-- 3. Add the following RLS policies:

-- IMPORTANT: Run these commands in the SQL Editor after creating the bucket:

-- Allow anyone to view return images (public bucket)
-- CREATE POLICY "Public can view return images"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'return-images');

-- Allow authenticated users and anonymous to upload images
-- CREATE POLICY "Anyone can upload return images"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'return-images');

-- Allow service role to delete images (for cleanup)
-- CREATE POLICY "Service role can delete return images"
-- ON storage.objects FOR DELETE
-- USING (bucket_id = 'return-images' AND auth.role() = 'service_role');

-- ============================================================================
-- Alternative: Use the following SQL to create the bucket directly
-- (requires Supabase CLI or running in SQL Editor with appropriate permissions)
-- ============================================================================

-- Insert bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'return-images',
  'return-images',
  true,  -- Public bucket
  5242880,  -- 5MB max file size
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Storage RLS Policies
-- Note: These may need to be run separately if storage.objects table doesn't exist yet

-- Allow public to view return images
DROP POLICY IF EXISTS "Public can view return images" ON storage.objects;
CREATE POLICY "Public can view return images"
ON storage.objects FOR SELECT
USING (bucket_id = 'return-images');

-- Allow anyone to upload return images (needed for volunteer return flow)
DROP POLICY IF EXISTS "Anyone can upload return images" ON storage.objects;
CREATE POLICY "Anyone can upload return images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'return-images');

-- Allow service role to manage (delete) return images
DROP POLICY IF EXISTS "Service role manages return images" ON storage.objects;
CREATE POLICY "Service role manages return images"
ON storage.objects FOR DELETE
USING (bucket_id = 'return-images');
