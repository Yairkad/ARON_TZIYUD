# מערכת מאגר ציוד גלובלי - מדריך יישום

## 📋 סקירה כללית

מערכת המאגר הגלובלי מאפשרת ניהול מרכזי של כל הציוד במערכת. כל פריט ציוד נמצא במאגר אחד, וערים בוחרות אילו פריטים להוסיף למלאי שלהן.

### ✅ מה הושלם

1. **Migration למסד נתונים** - טבלאות חדשות והעברת נתונים קיימים
2. **Types עדכניים** - ממשקים ל-TypeScript
3. **4 API Routes חדשים**:
   - `/api/global-equipment` - ניהול מאגר גלובלי
   - `/api/global-equipment/approve` - אישור/דחיית בקשות
   - `/api/city-equipment` - ניהול ציוד עירוני
   - `/api/city-equipment/bulk-add` - הוספה מרובה
4. **עמוד Super Admin** - ניהול מאגר מלא
5. **Modal לבחירת ציוד** - ממשק נוח למנהלי ערים
6. **שינוי בעמוד Admin** - כפתור "פתח מאגר" במקום "העתק מעיר"

---

## 🚀 שלבי ההתקנה

### שלב 1: הרצת Migration

**חשוב מאוד:** לפני הכל, גבה את מסד הנתונים!

```bash
# אפשרות A: דרך Supabase Dashboard
1. היכנס ל-https://supabase.com/dashboard
2. בחר בפרויקט שלך
3. SQL Editor
4. העתק את התוכן של הקובץ: supabase/migrations/20251119_global_equipment_pool.sql
5. הרץ את הסקריפט
6. ודא שאין שגיאות

# אפשרות B: דרך Supabase CLI (אם מותקן)
npx supabase db push
```

**מה ה-Migration עושה:**
- ✅ יוצר טבלת `global_equipment_pool` (מאגר גלובלי)
- ✅ יוצר טבלת `city_equipment` (קישורים לערים)
- ✅ מוסיף עמודות ל-`borrow_history` ו-`request_items`
- ✅ **מעתיק אוטומטית** את כל הציוד הקיים למאגר החדש
  - מיזוג פריטים זהים (לפי שם)
  - שמירת הקטגוריה והתמונה העדכנית ביותר
  - יצירת קישורים לכל עיר עם הכמות המקורית
- ✅ מגדיר RLS Policies
- ✅ **לא מוחק** את הטבלה הישנה (נשארת לגיבוי)

### שלב 2: בדיקת התקנה

לאחר הרצת ה-Migration, ודא:

```sql
-- בדוק שהטבלאות נוצרו
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('global_equipment_pool', 'city_equipment');

-- בדוק כמה פריטים במאגר
SELECT COUNT(*) as total_global_equipment FROM global_equipment_pool;

-- בדוק כמה קישורים לערים
SELECT COUNT(*) as total_city_links FROM city_equipment;

-- בדוק פריט לדוגמה
SELECT
  gep.name,
  COUNT(ce.id) as cities_using_it
FROM global_equipment_pool gep
LEFT JOIN city_equipment ce ON ce.global_equipment_id = gep.id
GROUP BY gep.id, gep.name
ORDER BY cities_using_it DESC
LIMIT 10;
```

### שלב 3: פריסת הקוד

```bash
# ודא שכל הקבצים החדשים נמצאים במקום
# 1. Migration
ls supabase/migrations/20251119_global_equipment_pool.sql

# 2. Types
ls src/types/index.ts

# 3. API Routes
ls src/app/api/global-equipment/route.ts
ls src/app/api/global-equipment/approve/route.ts
ls src/app/api/city-equipment/route.ts
ls src/app/api/city-equipment/bulk-add/route.ts

# 4. Components
ls src/components/EquipmentPoolModal.tsx

# 5. Pages
ls src/app/super-admin/global-equipment/page.tsx
ls src/app/super-admin/page.tsx  # עודכן
ls src/app/city/[cityId]/admin/page.tsx  # עודכן

# Build ו-Deploy
npm run build
# אם הבניה עוברת בהצלחה:
git add .
git commit -m "Add global equipment pool system"
git push
```

---

## 📖 מדריך שימוש

### עבור Super Admin

1. **כניסה למאגר הגלובלי**
   - היכנס לעמוד Super Admin
   - לחץ על "📦 מאגר ציוד"

2. **הוספת פריט חדש למאגר**
   - לחץ "+ הוסף ציוד חדש"
   - מלא: שם, קטגוריה, תמונה (URL או Emoji)
   - הפריט נכנס מיד בסטטוס `active`

3. **אישור בקשות ממתינות**
   - עבור לטאב "ממתינים לאישור"
   - תראה פריטים שמנהלי ערים הוסיפו
   - לחץ "✓ אשר" או "✗ דחה"

4. **עריכת פריט**
   - לחץ "ערוך" ליד הפריט
   - ניתן לשנות: שם, תמונה, קטגוריה
   - **השינוי משפיע על כל הערים!**

5. **מחיקת פריט**
   - לחץ "מחק" ליד הפריט
   - הפריט מועבר לסטטוס `archived`
   - **נמחק אוטומטית מכל הערים** (CASCADE)

### עבור מנהל עיר

1. **הוספת ציוד מהמאגר**
   - היכנס לעמוד Admin של העיר
   - טאב "ניהול ציוד"
   - לחץ "📦 פתח מאגר"
   - Modal ייפתח עם כל הציוד הזמין
   - סמן פריטים (או לחץ "סמן הכל")
   - לחץ "הוסף X פריטים נבחרים"

2. **חיפוש וסינון במאגר**
   - שדה חיפוש - חפש לפי שם
   - סינון לפי קטגוריה

3. **הוספת פריט חדש למאגר** (יישום עתידי)
   - בטופס הוספת ציוד חדש
   - סמן ✅ "הוסף למאגר הגלובלי"
   - הפריט נכנס בסטטוס `pending_approval`
   - Super Admin יקבל התראה ויאשר

4. **ניהול כמויות**
   - כל עיר מנהלת את הכמות שלה **עצמאית**
   - שינוי כמות לא משפיע על ערים אחרות

5. **הסרת פריט מהעיר**
   - לחץ "מחק" ליד הפריט
   - **הפריט נמחק רק מהעיר הזו**, נשאר במאגר

---

## 🔄 השוואה: לפני vs אחרי

### לפני (מערכת ישנה)
```
עיר א:
  - בורג סיליקון גדול (ID: 1)
  - תמונה: 🔩

עיר ב:
  - בורג סיליקון גדול (ID: 2)
  - תמונה: 🔧

→ פריטים נפרדים!
→ עדכון תמונה בעיר א לא משנה בעיר ב
→ הקמת עיר חדשה = העתקה ומחיקה ידנית
```

### אחרי (מערכת חדשה)
```
מאגר גלובלי:
  - בורג סיליקון גדול (ID: global_123)
  - תמונה: 🔩
  - קטגוריה: כלי עבודה

עיר א ← מקושר ל-global_123 (כמות: 5)
עיר ב ← מקושר ל-global_123 (כמות: 3)

→ פריט אחד!
→ עדכון תמונה משנה בכל הערים
→ הקמת עיר חדשה = בחירה ממאגר (מהיר!)
```

---

## ⚠️ נקודות חשובות

### 1. טבלה ישנה vs חדשה

**הטבלה הישנה `equipment` לא נמחקה!**
- נשארת לגיבוי והיסטוריה
- מסומנת DEPRECATED
- אל תוסיף אליה נתונים חדשים

**המערכת החדשה משתמשת ב:**
- `global_equipment_pool` - נתוני הפריט (שם, תמונה, קטגוריה)
- `city_equipment` - קישורים לערים (כמות, סדר תצוגה)

### 2. מה קורה כש-Super Admin מוחק פריט?

```sql
-- הפריט עובר ל-archived
UPDATE global_equipment_pool SET status = 'archived' WHERE id = '...';

-- ON DELETE CASCADE אוטומטי מוחק מכל הערים:
DELETE FROM city_equipment WHERE global_equipment_id = '...';
```

### 3. הרשאות

| פעולה | Super Admin | City Manager (full_access) | City Manager (view_only) |
|-------|-------------|---------------------------|-------------------------|
| צפייה במאגר | ✅ כולל pending | ✅ רק active | ✅ רק active |
| הוספת פריט למאגר | ✅ ישירות (active) | ✅ לאישור (pending) | ❌ |
| עריכת פריט במאגר | ✅ | ❌ | ❌ |
| מחיקת פריט מהמאגר | ✅ | ❌ | ❌ |
| הוספת פריט לעיר | ✅ | ✅ | ❌ |
| עדכון כמות בעיר | ✅ | ✅ | ❌ |
| הסרת פריט מעיר | ✅ | ✅ | ❌ |

### 4. מה עם borrow_history?

ההיסטוריה הקיימת **לא נפגעת**!
- Migration מעדכן אוטומטית `global_equipment_id`
- השדה `equipment_id` הישן נשאר (backwards compatibility)
- נתונים עתידיים ישתמשו ב-`global_equipment_id`

---

## 🐛 Troubleshooting

### בעיה: Migration נכשל

```
ERROR: duplicate key value violates unique constraint
```

**פתרון:**
```sql
-- בדוק אם הטבלאות כבר קיימות
SELECT * FROM global_equipment_pool LIMIT 1;

-- אם כן, הסר אותן והרץ מחדש
DROP TABLE IF EXISTS city_equipment CASCADE;
DROP TABLE IF EXISTS global_equipment_pool CASCADE;
```

### בעיה: אין ציוד במאגר אחרי Migration

**בדיקה:**
```sql
-- כמה פריטים היו בטבלה הישנה?
SELECT COUNT(*) FROM equipment WHERE name IS NOT NULL;

-- כמה פריטים במאגר החדש?
SELECT COUNT(*) FROM global_equipment_pool;
```

**אם המספר קטן:**
```sql
-- בדוק פריטים עם שמות ריקים או NULL
SELECT * FROM equipment WHERE name IS NULL OR TRIM(name) = '';
```

### בעיה: שגיאת הרשאות

```
Error: לא מורשה
```

**פתרון:**
1. ודא שהמשתמש מחובר
2. בדוק את ה-RLS policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'global_equipment_pool';
```

### בעיה: Modal לא נפתח

**בדיקה:**
- פתח Console (F12)
- חפש שגיאות JavaScript
- ודא ש-`EquipmentPoolModal.tsx` קיים
- בדוק import ב-`admin/page.tsx`

---

## 📊 סטטיסטיקות שימושיות (Queries)

### כמה ערים משתמשות בכל פריט

```sql
SELECT
  gep.name,
  gep.image_url,
  COUNT(ce.id) as cities_count
FROM global_equipment_pool gep
LEFT JOIN city_equipment ce ON ce.global_equipment_id = gep.id
WHERE gep.status = 'active'
GROUP BY gep.id, gep.name, gep.image_url
ORDER BY cities_count DESC;
```

### פריטים שאף עיר לא משתמשת בהם

```sql
SELECT gep.*
FROM global_equipment_pool gep
LEFT JOIN city_equipment ce ON ce.global_equipment_id = gep.id
WHERE ce.id IS NULL
AND gep.status = 'active';
```

### מי הוסיף כל פריט

```sql
SELECT
  gep.name,
  u.full_name as added_by,
  gep.status,
  gep.created_at
FROM global_equipment_pool gep
LEFT JOIN users u ON u.id = gep.created_by
ORDER BY gep.created_at DESC;
```

---

## 🔮 יישום עתידי (לא בוצע כרגע)

### 1. עדכון עמוד השאלה/החזרה
- שינוי שאילתות להשתמש ב-`city_equipment` + JOIN
- עדכון `borrow_history` לשמור `global_equipment_id`

### 2. התראות WhatsApp
- שליחת הודעה ל-Super Admin כש:
  - יש מעל 5 בקשות ממתינות
  - פעם ביום אם יש בקשות

### 3. הוספת פריט למאגר מטופס הוספה
- Checkbox: "☑ הוסף למאגר הגלובלי"
- נכנס ל-`pending_approval`

---

## ✅ Checklist לפני Production

- [ ] גיבוי מסד נתונים
- [ ] הרצת Migration בהצלחה
- [ ] בדיקת שאילתות ווידוא נתונים
- [ ] Build מקומי (`npm run build`)
- [ ] בדיקת עמוד Super Admin
- [ ] בדיקת Modal בעמוד City Admin
- [ ] בדיקת הוספה/עריכה/מחיקה
- [ ] בדיקת הרשאות (view_only, full_access)
- [ ] Deploy ל-Vercel/Production
- [ ] בדיקה בסביבת Production

---

## 📞 תמיכה

אם יש בעיות:
1. בדוק את ה-Console log (F12 → Console)
2. בדוק Supabase Logs
3. הרץ Queries מהסעיף Troubleshooting
4. ודא שכל הקבצים במקום

---

**תאריך יצירה:** 2025-11-19
**גרסה:** 1.0
**מפתח:** Claude Code
