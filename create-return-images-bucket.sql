-- יצירת Storage Bucket לתמונות החזרה
-- הרץ את זה ב-SQL Editor של Supabase

-- 1. יצור את ה-bucket (אם עדיין לא קיים)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'return-images',
  'return-images',
  true,  -- public = true כדי שמנהלים יוכלו לראות
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. הגדר RLS policies ל-bucket

-- מדיניות: כולם יכולים להעלות תמונות
CREATE POLICY IF NOT EXISTS "Anyone can upload return images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'return-images');

-- מדיניות: כולם יכולים לקרוא תמונות (public bucket)
CREATE POLICY IF NOT EXISTS "Anyone can view return images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'return-images');

-- מדיניות: רק authenticated users יכולים למחוק (למחיקה אוטומטית)
CREATE POLICY IF NOT EXISTS "Authenticated users can delete old return images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'return-images'
  AND auth.role() = 'authenticated'
);

-- 3. בדיקה - הצג את ה-bucket שנוצר
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'return-images';
