-- ================================================
-- שיוך ציוד והיסטוריה קיימים לעיר
-- ================================================
-- סקריפט זה משייך את כל הציוד וההיסטוריה
-- הקיימים לעיר הראשונה ברשימה
-- ================================================

-- ================================================
-- שלב 1: בדוק את רשימת הערים
-- ================================================
SELECT
    id,
    name AS "שם העיר",
    is_active AS "פעילה"
FROM cities
WHERE is_active = true
ORDER BY created_at
LIMIT 5;

-- העתק את ה-ID של העיר שאתה רוצה לשייך אליה!

-- ================================================
-- שלב 2: שייך את כל הציוד לעיר הראשונה
-- ================================================
-- ⚠️ חשוב: הסקריפט הזה ישייך את כל הציוד לעיר הפעילה הראשונה

UPDATE equipment
SET city_id = (
    SELECT id
    FROM cities
    WHERE is_active = true
    ORDER BY created_at
    LIMIT 1
)
WHERE city_id IS NULL;

-- ================================================
-- שלב 3: שייך את כל ההיסטוריה לעיר הראשונה
-- ================================================

UPDATE borrow_history
SET city_id = (
    SELECT id
    FROM cities
    WHERE is_active = true
    ORDER BY created_at
    LIMIT 1
)
WHERE city_id IS NULL;

-- ================================================
-- שלב 4: אימות - בדוק שהכל שויך
-- ================================================

-- בדוק ציוד
SELECT
    COUNT(*) AS "סה״כ ציוד",
    COUNT(city_id) AS "ציוד עם עיר",
    (SELECT name FROM cities WHERE id = equipment.city_id LIMIT 1) AS "שם העיר"
FROM equipment
GROUP BY city_id;

-- בדוק היסטוריה
SELECT
    COUNT(*) AS "סה״כ רשומות",
    COUNT(city_id) AS "רשומות עם עיר",
    (SELECT name FROM cities WHERE id = borrow_history.city_id LIMIT 1) AS "שם העיר"
FROM borrow_history
GROUP BY city_id;

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

-- ================================================
-- הצלחה! 🎉
-- ================================================
-- כל הציוד וההיסטוריה שוייכו לעיר הראשונה
-- כעת אתה יכול להוסיף ציוד חדש דרך הממשק
-- והוא ישויך אוטומטית לעיר הנכונה
-- ================================================
