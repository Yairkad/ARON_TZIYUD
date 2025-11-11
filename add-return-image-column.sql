-- הוספת עמודת תמונת החזרה לטבלת borrow_history

-- 1. הוסף עמודה לשמירת URL של תמונת ההחזרה
ALTER TABLE borrow_history
ADD COLUMN IF NOT EXISTS return_image_url TEXT;

-- 2. הוסף עמודה לשמירת תאריך העלאת התמונה (לצורך מחיקה אחרי 5 ימים)
ALTER TABLE borrow_history
ADD COLUMN IF NOT EXISTS return_image_uploaded_at TIMESTAMPTZ;

-- 3. צור index לשאילתות מהירות של תמונות ישנות (למחיקה)
CREATE INDEX IF NOT EXISTS idx_borrow_history_return_image_uploaded_at
ON borrow_history(return_image_uploaded_at)
WHERE return_image_url IS NOT NULL;

-- 4. בדיקה - הצג את המבנה החדש
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'borrow_history'
  AND column_name IN ('return_image_url', 'return_image_uploaded_at')
ORDER BY ordinal_position;

-- 5. הצג כמה רשומות לדוגמה
SELECT
    id,
    equipment_name,
    status,
    return_date,
    return_image_url,
    return_image_uploaded_at
FROM borrow_history
WHERE status = 'returned'
ORDER BY return_date DESC
LIMIT 5;
