-- ================================================
-- Migration: עדכון טבלת cities למבנה החדש
-- ================================================
-- סקריפט זה מעדכן טבלה קיימת למבנה החדש עם:
-- - 2 מנהלים (manager1 + manager2 אופציונלי)
-- - שדה location_url
-- - RLS policies מתוקנים
-- ================================================

-- ================================================
-- שלב 1: הוסף עמודות חדשות
-- ================================================

-- הוסף עמודה למנהל ראשון
ALTER TABLE public.cities
ADD COLUMN IF NOT EXISTS manager1_name TEXT,
ADD COLUMN IF NOT EXISTS manager1_phone TEXT;

-- הוסף עמודות למנהל שני (אופציונלי)
ALTER TABLE public.cities
ADD COLUMN IF NOT EXISTS manager2_name TEXT,
ADD COLUMN IF NOT EXISTS manager2_phone TEXT;

-- הוסף עמודה לקישור מיקום
ALTER TABLE public.cities
ADD COLUMN IF NOT EXISTS location_url TEXT;

-- ================================================
-- שלב 2: העתק נתונים מעמודות ישנות לחדשות
-- ================================================

-- העתק את המנהל הקיים למנהל ראשון
UPDATE public.cities
SET
    manager1_name = manager_name,
    manager1_phone = manager_phone
WHERE manager1_name IS NULL;

-- ================================================
-- שלב 3: הוסף אילוצים (constraints)
-- ================================================

-- הפוך manager1 לחובה רק אחרי שהעתקנו את הנתונים
ALTER TABLE public.cities
ALTER COLUMN manager1_name SET NOT NULL,
ALTER COLUMN manager1_phone SET NOT NULL;

-- הוסף בדיקת פורמט לטלפון מנהל 1
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'cities_manager1_phone_check'
    ) THEN
        ALTER TABLE public.cities
        ADD CONSTRAINT cities_manager1_phone_check
        CHECK (manager1_phone ~ '^[0-9]{10}$');
    END IF;
END $$;

-- הוסף בדיקת פורמט לטלפון מנהל 2 (אופציונלי)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'cities_manager2_phone_check'
    ) THEN
        ALTER TABLE public.cities
        ADD CONSTRAINT cities_manager2_phone_check
        CHECK (manager2_phone IS NULL OR manager2_phone ~ '^[0-9]{10}$');
    END IF;
END $$;

-- ================================================
-- שלב 4: מחק עמודות ישנות
-- ================================================

-- מחק את העמודות הישנות (רק אחרי שהעתקנו את הנתונים!)
ALTER TABLE public.cities
DROP COLUMN IF EXISTS manager_name,
DROP COLUMN IF EXISTS manager_phone;

-- ================================================
-- שלב 5: עדכן RLS Policies
-- ================================================

-- מחק policies ישנים
DROP POLICY IF EXISTS "Allow public read access to active cities" ON public.cities;
DROP POLICY IF EXISTS "Allow public read access to cities" ON public.cities;
DROP POLICY IF EXISTS "Allow public update access to cities" ON public.cities;
DROP POLICY IF EXISTS "Allow public delete access to cities" ON public.cities;
DROP POLICY IF EXISTS "Allow public insert access to cities" ON public.cities;

-- צור policies חדשים
CREATE POLICY "Allow public read access to cities"
    ON public.cities FOR SELECT
    USING (true);

CREATE POLICY "Allow public update access to cities"
    ON public.cities FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow public delete access to cities"
    ON public.cities FOR DELETE
    USING (true);

CREATE POLICY "Allow public insert access to cities"
    ON public.cities FOR INSERT
    WITH CHECK (true);

-- עדכן הרשאות
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cities TO authenticated;

-- ================================================
-- שלב 6: אימות
-- ================================================

-- בדוק את המבנה החדש
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'cities'
ORDER BY ordinal_position;

-- בדוק את הנתונים
SELECT
    name,
    manager1_name,
    manager1_phone,
    manager2_name,
    manager2_phone,
    location_url,
    is_active
FROM public.cities;

-- ================================================
-- סיום
-- ================================================
-- המערכת עכשיו מעודכנת למבנה החדש!
-- כל הערים הקיימות שלך עדיין שם, עם מנהל אחד.
-- תוכל להוסיף מנהל שני ומיקום דרך הממשק.
-- ================================================
