-- ================================================
-- תיקון - שיוך מחדש הציוד לבית שמש
-- ================================================
-- סקריפט זה משייך את כל הציוד וההיסטוריה
-- לבית שמש במקום מגדל עוז
-- ================================================

-- ================================================
-- שלב 1: בדוק את רשימת הערים עם ה-IDs שלהן
-- ================================================
SELECT
    id,
    name AS "שם העיר",
    created_at AS "תאריך יצירה",
    is_active AS "פעילה"
FROM cities
ORDER BY name;

-- ================================================
-- שלב 2: שייך את כל הציוד לבית שמש
-- ================================================

UPDATE equipment
SET city_id = (
    SELECT id
    FROM cities
    WHERE name = 'בית שמש - נחל לכיש'
    LIMIT 1
);

-- ================================================
-- שלב 3: שייך את כל ההיסטוריה לבית שמש
-- ================================================

UPDATE borrow_history
SET city_id = (
    SELECT id
    FROM cities
    WHERE name = 'בית שמש - נחל לכיש'
    LIMIT 1
);

-- ================================================
-- שלב 4: אימות - בדוק שהכל שויך נכון
-- ================================================

-- בדוק ציוד
SELECT
    COUNT(*) AS "סה״כ ציוד",
    c.name AS "שם העיר"
FROM equipment e
LEFT JOIN cities c ON e.city_id = c.id
GROUP BY c.name;

-- בדוק היסטוריה
SELECT
    COUNT(*) AS "סה״כ רשומות",
    c.name AS "שם העיר"
FROM borrow_history bh
LEFT JOIN cities c ON bh.city_id = c.id
GROUP BY c.name;

-- ================================================
-- שלב 5: בדיקה מפורטת - הצג דוגמאות
-- ================================================

-- הצג 5 פריטי ציוד ראשונים עם העיר שלהם
SELECT
    e.name AS "שם הציוד",
    e.quantity AS "כמות",
    c.name AS "עיר"
FROM equipment e
LEFT JOIN cities c ON e.city_id = c.id
LIMIT 5;

-- הצג 5 רשומות היסטוריה ראשונות עם העיר שלהן
SELECT
    bh.name AS "שם לווה",
    bh.equipment_name AS "ציוד",
    bh.status AS "סטטוס",
    c.name AS "עיר"
FROM borrow_history bh
LEFT JOIN cities c ON bh.city_id = c.id
ORDER BY bh.borrow_date DESC
LIMIT 5;

-- ================================================
-- הצלחה! 🎉
-- ================================================
-- כל הציוד וההיסטוריה עכשיו משוייכים לבית שמש!
-- ================================================
