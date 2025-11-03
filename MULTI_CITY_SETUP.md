# מדריך להפעלת המערכת הרב-עירונית

## סקירה כללית

המערכת שודרגה למערכת רב-עירונית! כעת ניתן לנהל מספר ערים, כל אחת עם:
- **מלאי ציוד נפרד**
- **היסטוריית השאלות נפרדת**
- **מנהל יחידה ייעודי**
- **סיסמה ייחודית**

---

## שלב 1: הרצת SQL ב-Supabase

### 1.1 כניסה ל-Supabase
1. היכנס ל-[Supabase Dashboard](https://supabase.com/dashboard)
2. בחר את הפרויקט שלך
3. לחץ על **SQL Editor** בתפריט הצד

### 1.2 בחר את הסקריפט המתאים

**יש לך כבר טבלת cities?** בחר אחת מהאופציות:

#### אופציה A: טבלה קיימת (Migration) ⭐ מומלץ
אם יש לך כבר ערים במערכת:
1. פתח את הקובץ `migration-update-cities.sql`
2. העתק את כל התוכן
3. הדבק ב-SQL Editor
4. לחץ **RUN**

זה יעדכן את הטבלה הקיימת בלי למחוק נתונים!

#### אופציה B: טבלה חדשה (התחלה מאפס)
אם זו התקנה חדשה:
1. פתח את הקובץ `database-multi-city.sql`
2. העתק את כל התוכן
3. הדבק ב-SQL Editor
4. לחץ **RUN**

### 1.3 אישור הצלחה
וודא שהטבלאות והפוליסיות נוצרו בהצלחה:
```sql
SELECT * FROM cities;
SELECT column_name FROM information_schema.columns WHERE table_name = 'equipment';
SELECT column_name FROM information_schema.columns WHERE table_name = 'borrow_history';

-- בדיקת RLS policies
SELECT policyname FROM pg_policies WHERE tablename = 'cities';
```

אתה אמור לראות:
- טבלת `cities` חדשה עם 3 ערים לדוגמה
- עמודה `city_id` ב-`equipment`
- עמודה `city_id` ב-`borrow_history`
- 4 policies: SELECT, INSERT, UPDATE, DELETE

---

## שלב 2: טיפול בנתונים קיימים

### אופציה A: התחלה מחדש (מומלץ לפיתוח)
אם אין לך נתונים חשובים, נקה הכל:
```sql
DELETE FROM borrow_history;
DELETE FROM equipment;
```

### אופציה B: שיוך נתונים קיימים לעיר
אם יש לך נתונים קיימים שאתה רוצה לשמור:
```sql
-- שייך את כל הציוד הקיים לעיר ירושלים (לדוגמה)
UPDATE equipment
SET city_id = (SELECT id FROM cities WHERE name = 'ירושלים' LIMIT 1)
WHERE city_id IS NULL;

-- שייך את כל ההיסטוריה הקיימת לעיר ירושלים
UPDATE borrow_history
SET city_id = (SELECT id FROM cities WHERE name = 'ירושלים' LIMIT 1)
WHERE city_id IS NULL;
```

---

## שלב 3: בניית הפרויקט

```bash
cd "C:\Users\יאיר קדוש\ARON_TZIYUD"
npm run build
```

אם יש שגיאות TypeScript, הן יופיעו כאן. תקן אותן לפני שתמשיך.

---

## שלב 4: בדיקה מקומית

```bash
npm run dev
```

פתח את הדפדפן ב-`http://localhost:3000` ובדוק:

### 4.1 דף הבית - בחירת עיר
- [ ] רואה 3 ערים (ירושלים, תל אביב, חיפה)
- [ ] כפתורי חיוג ו-WhatsApp עובדים
- [ ] לחיצה על "כניסה למערכת" מעבירה לדף העיר

### 4.2 דף עיר ספציפי (`/city/[cityId]`)
- [ ] רואה את שם העיר בכותרת
- [ ] רואה רק ציוד של העיר הזו
- [ ] יכול להשאיל ציוד (נוסף רשומה עם city_id נכון)
- [ ] יכול להחזיר ציוד (רואה רק רשומות של העיר)

### 4.3 דף ניהול עיר (`/city/[cityId]/admin`)
- [ ] מבקש סיסמה (1111 לירושלים, 2222 לתל אביב, 3333 לחיפה)
- [ ] רואה רק ציוד של העיר בניהול
- [ ] יכול להוסיף ציוד חדש (נוסף עם city_id נכון)
- [ ] יכול לערוך/למחוק ציוד
- [ ] רואה רק היסטוריה של העיר
- [ ] יכול לשנות סיסמת העיר

### 4.4 דף מנהל על (`/super-admin`)
- [ ] מבקש סיסמה (1234)
- [ ] רואה את כל הערים
- [ ] יכול להוסיף עיר חדשה
- [ ] יכול לערוך פרטי עיר (שם, מנהל, טלפון, סיסמה)
- [ ] יכול להשבית/הפעיל עיר
- [ ] יכול למחוק עיר

---

## שלב 5: Push ל-GitHub ו-Deploy

```bash
git add .
git commit -m "שדרוג למערכת רב-עירונית מלאה

- הוספת טבלת cities
- הוספת city_id לציוד והיסטוריה
- דף בחירת עיר עם כפתורי קשר
- דף עיר ספציפי עם סינון לפי עיר
- דף ניהול לכל עיר עם סיסמה נפרדת
- דף מנהל על לניהול מרכזי של ערים"

git push
```

Vercel יעשה deploy אוטומטי!

---

## מבנה הניתוב החדש

```
/                        → דף בחירת עיר (home page)
/city/[cityId]           → דף משתמש לעיר ספציפית
/city/[cityId]/admin     → דף ניהול עיר (דורש סיסמת עיר)
/super-admin             → דף מנהל על (דורש סיסמת super-admin)
```

---

## סיסמאות ברירת מחדל

### מנהל על
- סיסמה: `1234`
- נשמר ב-`settings` table עם key `super_admin_password`

### ערים (לדוגמה)
- ירושלים: `1111`
- תל אביב: `2222`
- חיפה: `3333`

**⚠️ חשוב:** שנה את כל הסיסמאות בסביבת ייצור!

---

## סנכרון עם רשימת ערים קיימת

אם יש לך רשימת ערים קיימת:

1. פתח את הקובץ `sync-existing-cities.sql`
2. ערוך את רשימת הערים בקובץ עם הנתונים שלך
3. הרץ את הסקריפט ב-Supabase SQL Editor
4. הסקריפט ישתמש ב-`ON CONFLICT` כדי לעדכן ערים קיימות או להוסיף חדשות

**טיפ:** אם יש לך ציוד קיים שצריך לשייך לערים, ראה את שלב 2 ב-`database-multi-city.sql`

---

## פתרון בעיות נפוצות

### שגיאה: "city_id cannot be null"
- וודא שהרצת את ה-SQL ב-Supabase
- בדוק ש-`city_id` מועבר נכון בכל פעולות INSERT

### שגיאה: "Foreign key constraint failed"
- וודא שה-cityId קיים בטבלת cities
- בדוק שה-city לא נמחק

### לא רואה ערים בדף הבית
- בדוק ב-Supabase שיש ערים עם `is_active = true`
- בדוק את RLS policies בטבלת cities (צריך 4 policies: SELECT, INSERT, UPDATE, DELETE)

### לא מצליח להתחבר כמנהל עיר
- וודא שהסיסמה נכונה (בדוק ב-Supabase: `SELECT password FROM cities`)
- בדוק שה-city פעילה (`is_active = true`)

### לא מצליח למחוק עיר
- וודא שהרצת את הסקריפט המעודכן `database-multi-city.sql`
- בדוק שיש policy למחיקה: `SELECT policyname FROM pg_policies WHERE tablename = 'cities';`
- אם חסר policy למחיקה, הרץ מחדש את ה-SQL

---

## שיפורים עתידיים אפשריים

1. **הצפנת סיסמאות**: השתמש ב-bcrypt במקום plaintext
2. **Supabase Auth**: השתמש במערכת ההזדהות המובנית
3. **Analytics**: הוסף דוח סטטיסטיקות למנהל על
4. **Email Notifications**: שלח התראות למנהלי יחידות
5. **QR Codes**: צור QR code לכל עיר להדפסה

---

## תמיכה

אם נתקלת בבעיות:
1. בדוק את הקונסול בדפדפן (F12)
2. בדוק את Supabase logs
3. ודא ש-RLS policies מוגדרים נכון
4. בדוק את ה-network tab לשגיאות API

---

## סיכום

המערכת החדשה מספקת:
✅ ניהול מרכזי של מספר ערים
✅ בידוד מלא בין ערים
✅ ניהול עצמאי לכל מנהל עיר
✅ סיסמאות נפרדות לכל רמת הרשאה
✅ ממשק ידידותי ומודרני
✅ תמיכה מלאה במובייל

**בהצלחה! 🎉**
