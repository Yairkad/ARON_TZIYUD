-- ================================================
-- תיקון מהיר לטבלת cities
-- ================================================
-- סקריפט זה בודק מה חסר ומוסיף רק את מה שנחוץ
-- ================================================

-- ================================================
-- שלב 1: הוסף עמודות חדשות (רק אם הן לא קיימות)
-- ================================================

-- הוסף עמודה למנהל ראשון (אם לא קיימת)
ALTER TABLE public.cities
ADD COLUMN IF NOT EXISTS manager1_name TEXT;

ALTER TABLE public.cities
ADD COLUMN IF NOT EXISTS manager1_phone TEXT;

-- הוסף עמודות למנהל שני (אופציונלי)
ALTER TABLE public.cities
ADD COLUMN IF NOT EXISTS manager2_name TEXT;

ALTER TABLE public.cities
ADD COLUMN IF NOT EXISTS manager2_phone TEXT;

-- הוסף עמודה לקישור מיקום
ALTER TABLE public.cities
ADD COLUMN IF NOT EXISTS location_url TEXT;

-- ================================================
-- שלב 2: בדוק אם יש נתונים בעמודות manager1
-- ================================================

-- אם manager1_name ריק, תצטרך למלא אותו ידנית או דרך הממשק
-- בינתיים נוודא שהעמודות קיימות

-- ================================================
-- שלב 3: הוסף אילוצים (constraints) רק אם manager1 מלא
-- ================================================

-- נבדוק אם יש ערים עם manager1_name מלא
DO $$
DECLARE
    cities_with_manager1 INTEGER;
BEGIN
    SELECT COUNT(*) INTO cities_with_manager1
    FROM public.cities
    WHERE manager1_name IS NOT NULL AND manager1_name != '';

    -- אם יש ערים עם manager1, נוסיף את האילוץ NOT NULL
    IF cities_with_manager1 > 0 THEN
        -- הפוך manager1 לחובה
        ALTER TABLE public.cities
        ALTER COLUMN manager1_name SET NOT NULL;

        ALTER TABLE public.cities
        ALTER COLUMN manager1_phone SET NOT NULL;

        -- הוסף בדיקת פורמט לטלפון מנהל 1 (אם עוד לא קיים)
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'cities_manager1_phone_check'
        ) THEN
            ALTER TABLE public.cities
            ADD CONSTRAINT cities_manager1_phone_check
            CHECK (manager1_phone ~ '^[0-9]{10}$');
        END IF;
    ELSE
        RAISE NOTICE 'אזהרה: אין ערים עם manager1_name. מלא נתונים לפני הוספת אילוץ NOT NULL';
    END IF;

    -- בדיקת פורמט לטלפון מנהל 2 (אופציונלי)
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
-- שלב 4: עדכן RLS Policies
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
-- שלב 5: בדיקה - הצג את מבנה הטבלה
-- ================================================

SELECT
    column_name AS "שם עמודה",
    data_type AS "סוג",
    is_nullable AS "nullable",
    column_default AS "ברירת מחדל"
FROM information_schema.columns
WHERE table_name = 'cities'
ORDER BY ordinal_position;

-- ================================================
-- שלב 6: הצג את הנתונים הקיימים
-- ================================================

SELECT
    id,
    name AS "עיר",
    manager1_name AS "מנהל 1",
    manager1_phone AS "טלפון 1",
    manager2_name AS "מנהל 2",
    manager2_phone AS "טלפון 2",
    CASE WHEN location_url IS NOT NULL THEN '✅' ELSE '❌' END AS "מיקום",
    is_active AS "פעיל"
FROM cities
ORDER BY name;

-- ================================================
-- הערות חשובות
-- ================================================
-- אם manager1_name ריק, תצטרך למלא אותו:
-- 1. דרך הממשק super-admin (מומלץ)
-- 2. או ידנית ב-SQL:
--
-- UPDATE cities
-- SET
--     manager1_name = 'שם המנהל',
--     manager1_phone = '0501234567'
-- WHERE name = 'שם העיר';
-- ================================================
