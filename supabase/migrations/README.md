# הוראות הרצת Migration - Supabase Auth Setup

## סקירה כללית
Migration זה מוסיף מערכת אימות מלאה עם Supabase Auth כולל:
- ✅ טבלת משתמשים עם תפקידים (city_manager / super_admin)
- ✅ Row Level Security (RLS) על כל הטבלאות
- ✅ Email + Password authentication
- ✅ הרשאות מבוססות תפקידים

---

## 📋 שלבי ההתקנה

### שלב 1: הכנת Supabase Dashboard

1. **היכנס ל-Supabase Dashboard**: https://supabase.com/dashboard
2. **בחר את הפרויקט שלך**: `jgkmcsxrtovrdiguhwyv`
3. **הפעל Email Auth**:
   - לך ל: `Authentication` → `Providers`
   - ודא ש-`Email` מופעל (enabled)
   - **אופציונלי**: כבה `Confirm email` למהירות (לא מומלץ בפרודקשן)

---

### שלב 2: הרצת SQL Migrations

#### 2.1 הרץ את הקובץ הראשון

1. לך ל: `SQL Editor` בדשבורד
2. פתח קובץ חדש (New query)
3. העתק את כל התוכן מ-`20251111_auth_setup.sql`
4. לחץ `RUN` ▶️
5. ודא שאין שגיאות

#### 2.2 הרץ את הקובץ השני

1. צור query חדש נוסף
2. העתק את כל התוכן מ-`20251111_auth_rls_policies.sql`
3. לחץ `RUN` ▶️
4. ודא שאין שגיאות

---

### שלב 3: יצירת משתמש Super Admin ראשון

#### דרך A: דרך Supabase Dashboard (מומלץ)

1. לך ל: `Authentication` → `Users`
2. לחץ `Add user` → `Create new user`
3. מלא:
   - **Email**: `admin@aron-tziyud.local` (או מייל אמיתי)
   - **Password**: בחר סיסמה חזקה
   - **Auto Confirm User**: ✅ (אם כיבית email confirmation)
4. לחץ `Create user`

5. **חשוב!** עכשיו עדכן את הפרופיל:
   ```sql
   -- הרץ ב-SQL Editor:
   UPDATE auth.users
   SET raw_user_meta_data = jsonb_build_object(
     'role', 'super_admin',
     'full_name', 'Super Admin'
   )
   WHERE email = 'admin@aron-tziyud.local';

   -- עדכן גם את טבלת users:
   UPDATE public.users
   SET role = 'super_admin',
       city_id = NULL,
       full_name = 'Super Admin'
   WHERE email = 'admin@aron-tziyud.local';
   ```

#### דרך B: דרך SQL ישירות

```sql
-- הרץ ב-SQL Editor:

-- 1. צור משתמש חדש
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'admin@aron-tziyud.local',
  crypt('YOUR_PASSWORD_HERE', gen_salt('bf')), -- החלף YOUR_PASSWORD_HERE
  NOW(),
  jsonb_build_object('role', 'super_admin', 'full_name', 'Super Admin'),
  NOW(),
  NOW()
);

-- 2. הפרופיל ייווצר אוטומטית דרך הטריגר
```

---

### שלב 4: יצירת משתמשי City Managers

#### אופציה A: יצירה ידנית (למספר קטן של ערים)

לכל עיר, צור משתמש:

```sql
-- דוגמה ליצירת משתמש למנהל עיר ירושלים:

-- 1. מצא את ה-city_id:
SELECT id, name FROM public.cities WHERE name = 'ירושלים';
-- נניח שקיבלת: 12345678-1234-1234-1234-123456789012

-- 2. צור משתמש חדש ב-Dashboard:
-- Email: jerusalem.manager@aron-tziyud.local
-- Password: [בחר סיסמה]

-- 3. קשר למשתמש לעיר:
UPDATE public.users
SET
  role = 'city_manager',
  city_id = '12345678-1234-1234-1234-123456789012',
  full_name = 'מנהל ירושלים'
WHERE email = 'jerusalem.manager@aron-tziyud.local';
```

#### אופציה B: סקריפט אוטומטי (בקרוב)

יצרתי עבורך סקריפט Node.js שיכול לייצר אוטומטית משתמשים לכל הערים הקיימות.

---

### שלב 5: בדיקת התקנה

הרץ queries אלה לוודא שהכל עובד:

```sql
-- בדוק שהטבלה נוצרה:
SELECT * FROM public.users;

-- בדוק שה-RLS פועל:
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- בדוק שהפונקציות עובדות:
SELECT public.is_super_admin();
SELECT public.get_user_city_id();
```

---

## 🔒 הערות אבטחה

1. **Service Role Key**:
   - ✅ כבר קיים ב-`.env.local.txt`
   - ⚠️ **לעולם אל תחשוף אותו בצד לקוח!**

2. **RLS מופעל**:
   - כל הטבלאות מוגנות עכשיו
   - רק משתמשים מורשים יכולים לגשת לנתונים

3. **Email Confirmation**:
   - אם השארת מופעל: משתמשים יקבלו מייל אימות
   - אם כיבית: משתמשים יכולים להיכנס מיד

---

## 🚨 מה לעשות אם יש בעיות?

### שגיאה: "relation users already exists"
```sql
-- הטבלה כבר קיימת, דלג על יצירתה או מחק אותה:
DROP TABLE IF EXISTS public.users CASCADE;
-- הרץ שוב את המיגרציה
```

### שגיאה: "type user_role already exists"
```sql
-- הטייפ כבר קיים:
DROP TYPE IF EXISTS user_role CASCADE;
-- הרץ שוב את המיגרציה
```

### שגיאה: "policy already exists"
זה בסדר! ה-`DROP POLICY IF EXISTS` אמור לטפל בזה.

---

## ✅ סיימת?

עכשיו תוכל לעבור לשלב הבא:
- עדכון API Routes לשימוש ב-Auth החדש
- עדכון דפי Login
- הוספת Password Reset

**צריך עזרה?** פנה אליי ואני אעזור! 🚀
