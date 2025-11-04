-- ================================================
-- Row Level Security (RLS) Policies
-- הגדרות אבטחה למניעת גישה לא מורשית לנתונים
-- ================================================

-- ================================================
-- שלב 1: הפעלת RLS על כל הטבלאות
-- ================================================

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrow_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- ================================================
-- שלב 2: מחיקת Policies קיימים (אם יש)
-- ================================================

-- Cities
DROP POLICY IF EXISTS "Allow public read access to cities" ON public.cities;
DROP POLICY IF EXISTS "Allow public insert access to cities" ON public.cities;
DROP POLICY IF EXISTS "Allow public update access to cities" ON public.cities;
DROP POLICY IF EXISTS "Allow public delete access to cities" ON public.cities;

-- Equipment
DROP POLICY IF EXISTS "Allow public read access to equipment" ON public.equipment;
DROP POLICY IF EXISTS "Allow public insert access to equipment" ON public.equipment;
DROP POLICY IF EXISTS "Allow public update access to equipment" ON public.equipment;
DROP POLICY IF EXISTS "Allow public delete access to equipment" ON public.equipment;

-- Borrow History
DROP POLICY IF EXISTS "Allow public read access to borrow_history" ON public.borrow_history;
DROP POLICY IF EXISTS "Allow public insert access to borrow_history" ON public.borrow_history;
DROP POLICY IF EXISTS "Allow public update access to borrow_history" ON public.borrow_history;
DROP POLICY IF EXISTS "Allow public delete access to borrow_history" ON public.borrow_history;

-- Settings
DROP POLICY IF EXISTS "Allow public read access to settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public insert access to settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public update access to settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public delete access to settings" ON public.settings;

-- Admin Notifications
DROP POLICY IF EXISTS "Allow public read access to admin notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Allow public insert access to admin notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Allow public update access to admin notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Allow public delete access to admin notifications" ON public.admin_notifications;

-- ================================================
-- שלב 3: יצירת Policies חדשים (מאובטחים יותר)
-- ================================================

-- **הערה חשובה:**
-- כיוון שהמערכת לא משתמשת ב-Supabase Auth (אין JWT tokens של Supabase),
-- אנחנו נותנים גישה ציבורית אבל מסתמכים על האימות בצד השרת (API Routes).
-- זו אינה האבטחה המושלמת, אבל משמעותית יותר טובה מאשר ללא RLS בכלל.

-- **Cities Table**
-- קריאה: כולם יכולים לראות ערים פעילות
CREATE POLICY "Public can read active cities"
ON public.cities FOR SELECT
TO public
USING (is_active = true);

-- הוספה/עדכון/מחיקה: לא מאפשרים ישירות מהדפדפן
-- (רק דרך API Routes שלנו)
CREATE POLICY "Deny direct insert to cities"
ON public.cities FOR INSERT
TO public
WITH CHECK (false);

CREATE POLICY "Deny direct update to cities"
ON public.cities FOR UPDATE
TO public
USING (false);

CREATE POLICY "Deny direct delete to cities"
ON public.cities FOR DELETE
TO public
USING (false);

-- **Equipment Table**
-- קריאה: כולם יכולים לראות ציוד
CREATE POLICY "Public can read equipment"
ON public.equipment FOR SELECT
TO public
USING (true);

-- הוספה/עדכון/מחיקה: רק דרך API Routes
CREATE POLICY "Deny direct insert to equipment"
ON public.equipment FOR INSERT
TO public
WITH CHECK (false);

CREATE POLICY "Deny direct update to equipment"
ON public.equipment FOR UPDATE
TO public
USING (false);

CREATE POLICY "Deny direct delete to equipment"
ON public.equipment FOR DELETE
TO public
USING (false);

-- **Borrow History Table**
-- קריאה: כולם יכולים לראות היסטוריה
CREATE POLICY "Public can read borrow_history"
ON public.borrow_history FOR SELECT
TO public
USING (true);

-- הוספה: משתמשים יכולים להוסיף השאלות חדשות
CREATE POLICY "Public can insert borrow_history"
ON public.borrow_history FOR INSERT
TO public
WITH CHECK (true);

-- עדכון/מחיקה: רק דרך API Routes
CREATE POLICY "Deny direct update to borrow_history"
ON public.borrow_history FOR UPDATE
TO public
USING (false);

CREATE POLICY "Deny direct delete to borrow_history"
ON public.borrow_history FOR DELETE
TO public
USING (false);

-- **Settings Table**
-- קריאה: רק דרך API Routes (להגנה על סיסמת מנהל על)
CREATE POLICY "Deny direct read from settings"
ON public.settings FOR SELECT
TO public
USING (false);

CREATE POLICY "Deny direct insert to settings"
ON public.settings FOR INSERT
TO public
WITH CHECK (false);

CREATE POLICY "Deny direct update to settings"
ON public.settings FOR UPDATE
TO public
USING (false);

CREATE POLICY "Deny direct delete to settings"
ON public.settings FOR DELETE
TO public
USING (false);

-- **Admin Notifications Table**
-- קריאה והוספה: מותרים
CREATE POLICY "Public can read admin_notifications"
ON public.admin_notifications FOR SELECT
TO public
USING (true);

CREATE POLICY "Public can insert admin_notifications"
ON public.admin_notifications FOR INSERT
TO public
WITH CHECK (true);

-- עדכון/מחיקה: רק דרך API Routes
CREATE POLICY "Deny direct update to admin_notifications"
ON public.admin_notifications FOR UPDATE
TO public
USING (false);

CREATE POLICY "Deny direct delete to admin_notifications"
ON public.admin_notifications FOR DELETE
TO public
USING (false);

-- ================================================
-- שלב 4: אימות
-- ================================================

-- בדוק שה-RLS מופעל
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('cities', 'equipment', 'borrow_history', 'settings', 'admin_notifications');

-- בדוק שה-Policies נוצרו
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ================================================
-- שלב 5: הערות חשובות
-- ================================================

-- **מגבלות RLS הנוכחי:**
-- 1. אין אימות אמיתי ברמת מסד הנתונים (אין JWT של Supabase)
-- 2. המערכת מסתמכת על האימות בצד השרת (API Routes)
-- 3. משתמשים חכמים עדיין יכולים לקרוא נתונים ישירות מ-Supabase

-- **שיפורים עתידיים מומלצים:**
-- 1. מעבר ל-Supabase Auth עם JWT tokens
-- 2. שימוש ב-Service Role Key רק בצד השרת
-- 3. הפיכת כל הטבלאות ל-private עם policies מבוססי-JWT

-- ================================================
-- סיימנו! 🎉
-- ================================================
