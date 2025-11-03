-- ================================================
-- יצירת טבלת התראות למנהל ראשי
-- ================================================
-- טבלה זו תשמש לשמירת התראות על שינויים שמבצעים מנהלי ערים
-- ================================================

-- ================================================
-- שלב 1: יצירת הטבלה
-- ================================================

CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
    city_name TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ================================================
-- שלב 2: יצירת אינדקסים לשיפור ביצועים
-- ================================================

CREATE INDEX IF NOT EXISTS idx_admin_notifications_city_id ON public.admin_notifications(city_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON public.admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications(created_at DESC);

-- ================================================
-- שלב 3: הגדרת Row Level Security (RLS)
-- ================================================

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Policy למחיקת policies קיימים אם יש
DROP POLICY IF EXISTS "Allow public read access to admin notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Allow public insert access to admin notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Allow public update access to admin notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Allow public delete access to admin notifications" ON public.admin_notifications;

-- Policy חדש - גישה מלאה לכולם (כי אין אימות משתמשים)
CREATE POLICY "Allow public read access to admin notifications"
ON public.admin_notifications FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public insert access to admin notifications"
ON public.admin_notifications FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow public update access to admin notifications"
ON public.admin_notifications FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete access to admin notifications"
ON public.admin_notifications FOR DELETE
TO public
USING (true);

-- ================================================
-- שלב 4: אימות
-- ================================================

-- בדוק שהטבלה נוצרה
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'admin_notifications'
ORDER BY ordinal_position;

-- בדוק שהאינדקסים נוצרו
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'admin_notifications';

-- בדוק שה-RLS policies נוצרו
SELECT
    policyname,
    cmd
FROM pg_policies
WHERE tablename = 'admin_notifications';

-- ================================================
-- סיימנו! 🎉
-- ================================================
-- כעת מנהלי ערים יוכלו לעדכן פרטים
-- והמנהל הראשי יקבל התראות על השינויים
-- ================================================
