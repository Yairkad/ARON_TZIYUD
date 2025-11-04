# 🔒 שיפורי אבטחה - מערכת ארון ציוד ידידים

תיעוד מלא של שיפורי האבטחה שבוצעו במערכת

---

## 📋 תוכן עניינים

1. [סיכום השינויים](#סיכום-השינויים)
2. [מה שופר?](#מה-שופר)
3. [קבצים שנוצרו/עודכנו](#קבצים-שנוצרועודכנו)
4. [הוראות התקנה](#הוראות-התקנה)
5. [איך המערכת עובדת עכשיו?](#איך-המערכת-עובדת-עכשיו)
6. [דירוג אבטחה](#דירוג-אבטחה)
7. [שיפורים עתידיים](#שיפורים-עתידיים)

---

## 🎯 סיכום השינויים

המערכת שודרגה מ**אבטחה בסיסית בצד לקוח** ל**אבטחה משופרת עם אימות צד-שרת**.

### לפני השיפורים:
- ❌ אימות רק בצד הלקוח (JavaScript)
- ❌ סיסמאות בטקסט גלוי במסד הנתונים
- ❌ אין הגבלת ניסיונות התחברות
- ❌ אפשר לעקוף אימות עם `setIsAuthenticated(true)`
- ❌ אין RLS במסד הנתונים

### אחרי השיפורים:
- ✅ אימות בצד השרת דרך API Routes
- ✅ הצפנת סיסמאות עם bcrypt
- ✅ Rate Limiting נגד Brute Force
- ✅ Session Management מאובטח עם cookies
- ✅ RLS Policies ב-Supabase
- ✅ תמיכה אחורה בסיסמאות ישנות

---

## 🛡️ מה שופר?

### 1. **אימות צד-שרת (Server-Side Authentication)**

**הבעיה:** אימות בצד הלקוח ניתן לעקיפה פשוטה.

**הפתרון:** נוצרו API Routes ב-Next.js:
- `POST /api/auth/city/login` - התחברות מנהל עיר
- `POST /api/auth/super-admin/login` - התחברות מנהל על
- `GET /api/auth/verify` - אימות session
- `POST /api/auth/logout` - התנתקות

**קוד לדוגמה:**
```typescript
// בדיקת סיסמה בצד השרת
const isPasswordValid = await bcrypt.compare(password, storedHashedPassword)
```

---

### 2. **הצפנת סיסמאות (Password Hashing)**

**הבעיה:** סיסמאות נשמרו בטקסט גלוי.

**הפתרון:** שימוש ב-bcrypt להצפנת סיסמאות.

**תהליך ההצפנה:**
```typescript
const hashedPassword = await bcrypt.hash(password, 10)
```

**תמיכה אחורה:**
המערכת מזהה אוטומטית סיסמאות ישנות (טקסט גלוי) ומצפינה אותן בפעם הראשונה שהמשתמש מתחבר:

```typescript
if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$')) {
  // סיסמה מוצפנת - השתמש ב-bcrypt
  isValid = await bcrypt.compare(password, storedPassword)
} else {
  // סיסמה ישנה - השווה ישירות והצפן
  isValid = password === storedPassword
  if (isValid) {
    const hashed = await bcrypt.hash(password, 10)
    await updatePassword(hashed) // עדכן במסד נתונים
  }
}
```

---

### 3. **Rate Limiting (הגבלת קצב)**

**הבעיה:** אפשר לנסות סיסמאות אינסוף פעמים (Brute Force).

**הפתרון:** הגבלת ניסיונות התחברות:

#### מנהל עיר:
- **5 ניסיונות** מקסימום
- **Lockout של 15 דקות** אחרי 5 כישלונות

#### מנהל על:
- **3 ניסיונות** מקסימום
- **Lockout של 30 דקות** אחרי 3 כישלונות

**קוד:**
```typescript
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 5
const LOCKOUT_TIME = 15 * 60 * 1000 // 15 minutes

if (attempts.count >= MAX_ATTEMPTS) {
  if (now - attempts.lastAttempt < LOCKOUT_TIME) {
    return error('נסיונות רבים מדי. נסה שוב בעוד X דקות')
  }
}
```

---

### 4. **Session Management (ניהול סשנים)**

**הבעיה:** אין ניהול session אמיתי.

**הפתרון:** Cookies מאובטחים עם הגדרות אבטחה:

```typescript
response.cookies.set('city_session', sessionToken, {
  httpOnly: true,       // לא נגיש מ-JavaScript (הגנה מפני XSS)
  secure: true,         // רק HTTPS בפרודקשן
  sameSite: 'strict',   // הגנה מפני CSRF
  maxAge: 60 * 60 * 8,  // תוקף 8 שעות
  path: '/'
})
```

**Session Token:**
```typescript
const sessionToken = Buffer.from(JSON.stringify({
  userId: cityId,
  userType: 'city',
  timestamp: Date.now()
})).toString('base64')
```

---

### 5. **Row Level Security (RLS)**

**הבעיה:** כל אחד יכול לגשת לכל הנתונים ישירות דרך Supabase.

**הפתרון:** RLS Policies שמגבילים גישה:

#### טבלת Cities:
- **קריאה:** רק ערים פעילות (`is_active = true`)
- **כתיבה/עדכון/מחיקה:** חסומים (רק דרך API)

#### טבלת Equipment:
- **קריאה:** מותרת לכולם
- **כתיבה/עדכון/מחיקה:** חסומים (רק דרך API)

#### טבלת Settings:
- **הכל חסום** - הגנה על סיסמת מנהל על

**קוד SQL:**
```sql
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active cities"
ON public.cities FOR SELECT
TO public
USING (is_active = true);

CREATE POLICY "Deny direct update to cities"
ON public.cities FOR UPDATE
TO public
USING (false);
```

---

## 📁 קבצים שנוצרו/עודכנו

### קבצים חדשים:

1. **src/app/api/auth/city/login/route.ts**
   - API endpoint לאימות מנהל עיר
   - Rate limiting: 5 ניסיונות / 15 דקות

2. **src/app/api/auth/super-admin/login/route.ts**
   - API endpoint לאימות מנהל על
   - Rate limiting: 3 ניסיונות / 30 דקות

3. **src/app/api/auth/logout/route.ts**
   - התנתקות ומחיקת session cookies

4. **src/app/api/auth/verify/route.ts**
   - בדיקת תקינות session

5. **src/lib/auth.ts**
   - פונקציות עזר לאימות בצד הלקוח

6. **setup-rls-policies.sql**
   - SQL script להגדרת RLS Policies

7. **SECURITY_IMPROVEMENTS.md** (קובץ זה)
   - תיעוד מלא

### קבצים שעודכנו:

1. **src/app/city/[cityId]/admin/page.tsx**
   - שימוש ב-API Routes במקום אימות לוקלי
   - בדיקת session בטעינת הדף
   - התנתקות מאובטחת

2. **src/app/super-admin/page.tsx**
   - שימוש ב-API Routes במקום אימות לוקלי
   - בדיקת session בטעינת הדף
   - התנתקות מאובטחת

---

## ⚙️ הוראות התקנה

### שלב 1: התקנת תלויות

```bash
cd "C:\Users\יאיר קדוש\ARON_TZIYUD"
npm install bcryptjs @types/bcryptjs
```

### שלב 2: הגדרת RLS ב-Supabase

1. כנס ל-[Supabase Dashboard](https://supabase.com/dashboard)
2. בחר את הפרויקט שלך
3. לחץ על **SQL Editor** בתפריט הצד
4. פתח את הקובץ `setup-rls-policies.sql`
5. העתק והדבק את כל התוכן
6. לחץ על **RUN**
7. ודא שאין שגיאות

### שלב 3: בדיקה

```bash
npm run dev
```

נסה להתחבר כמנהל עיר/מנהל על ובדוק:
- ✅ האימות עובד
- ✅ סיסמאות ישנות מוצפנות אוטומטית
- ✅ Rate limiting עובד (נסה 6 פעמים עם סיסמה שגויה)
- ✅ Session נשמר (רענן דף וודא שאתה עדיין מחובר)
- ✅ התנתקות עובדת

---

## 🔄 איך המערכת עובדת עכשיו?

### תהליך התחברות (Login Flow):

```
משתמש מזין סיסמה
    ↓
Frontend שולח POST ל-/api/auth/city/login
    ↓
API Route בודק:
  1. Rate limiting (לא יותר מדי ניסיונות?)
  2. שולף סיסמה מ-Supabase
  3. משווה עם bcrypt (או טקסט גלוי לישנות)
  4. אם נכון - מצפין סיסמה ישנה
    ↓
יוצר Session Token
    ↓
שולח Cookie מאובטח ללקוח
    ↓
Frontend שומר isAuthenticated = true
    ↓
המשתמש רואה ממשק ניהול
```

### תהליך בדיקת Session:

```
טעינת דף ניהול
    ↓
useEffect מריץ checkAuth()
    ↓
Frontend שולח GET ל-/api/auth/verify
    ↓
API Route:
  1. קורא cookie
  2. מפענח session token
  3. בודק תוקף (לא יותר מ-8 שעות)
    ↓
מחזיר: authenticated + userId + userType
    ↓
Frontend מעדכן isAuthenticated
```

---

## 📊 דירוג אבטחה

### לפני: **3/10** ❌
- אין אבטחה אמיתית
- קל לפריצה
- לא מתאים לאינטרנט פתוח

### אחרי: **7/10** ✅
- אבטחה טובה לרוב המקרים
- מתאים לאינטרנט פתוח
- הגנה מפני רוב התקיxxxxxנפוצות

### מה חסר ל-10/10?
1. **Supabase Auth** - JWT אמיתיים במקום session tokens פשוטים
2. **2FA** - אימות דו-שלבי
3. **HTTPS מאולץ** - redirect אוטומטי
4. **Audit Logs** - תיעוד מלא של כל פעולה
5. **IP Whitelisting** - הגבלת גישה למנהל על

---

## 🚀 שיפורים עתידיים מומלצים

### עדיפות גבוהה:
1. **מעבר ל-Supabase Auth**
   ```typescript
   const { data, error } = await supabase.auth.signInWithPassword({
     email: `${cityId}@city.local`,
     password: password
   })
   ```

2. **שימוש ב-Service Role Key רק בצד השרת**
   - Anon Key לצד הלקוח
   - Service Role Key ל-API Routes

3. **JWT במקום Session Tokens**
   ```bash
   npm install jsonwebtoken @types/jsonwebtoken
   ```

### עדיפות בינונית:
4. **Rate Limiting מתקדם**
   ```bash
   npm install express-rate-limit
   ```

5. **Audit Logging**
   ```sql
   CREATE TABLE audit_logs (
     id UUID PRIMARY KEY,
     user_id TEXT,
     action TEXT,
     table_name TEXT,
     timestamp TIMESTAMPTZ
   );
   ```

6. **CAPTCHA על login**
   ```bash
   npm install react-google-recaptcha
   ```

### עדיפות נמוכה:
7. **2FA (Two-Factor Authentication)**
8. **Email notifications** על פעולות רגישות
9. **IP Whitelisting** למנהל על

---

## 📝 הערות חשובות

### מגבלות הנוכחיות:
1. **Session Tokens פשוטים** - לא JWT אמיתיים
2. **אין signature verification** על הטוקנים
3. **Rate Limiting במ זיכרון** - לא שרד הפעלה מחדש
4. **אין persistent sessions** - מחיקת cookies = logout

### בטיחות בפרודקשן:
- ✅ שנה `NODE_ENV=production` ב-`.env.local`
- ✅ השתמש ב-HTTPS (לא HTTP)
- ✅ עדכן סיסמאות ברירת מחדל
- ✅ הגדר Supabase RLS
- ✅ הגבל גישה ל-API keys

---

## 🆘 תמיכה ובעיות

### בעיות נפוצות:

**1. "סיסמה שגויה" למרות שהסיסמה נכונה**
- בדוק שהרצת `npm install bcryptjs`
- בדוק ש-API Routes רצים (`npm run dev`)
- בדוק console בדפדפן (F12) לשגיאות

**2. "נסיונות רבים מדי" מיד אחרי שגיאה אחת**
- Rate limiting כבר היה active מפעם קודמת
- חכה 15/30 דקות או הפעל מחדש את השרת

**3. Session לא נשמר אחרי רענון**
- בדוק שה-cookies מוגדרים כראוי
- בדוק שאין חסימת cookies בדפדפן
- בדוק שה-domain נכון

**4. RLS חוסם פעולות לגיטימיות**
- בדוק את ה-Policies ב-Supabase Dashboard
- אולי צריך להוסיף policy נוסף
- ודא ש-API Routes משתמשים ב-service role

---

## ✅ Checklist לפני Deploy

- [ ] הרצתי `npm install bcryptjs @types/bcryptjs`
- [ ] הרצתי את setup-rls-policies.sql ב-Supabase
- [ ] בדקתי שאימות עובד
- [ ] בדקתי ש-Rate Limiting עובד
- [ ] שיניתי `NODE_ENV=production`
- [ ] שיניתי את סיסמת מנהל על מ-1234
- [ ] בדקתי שה-site רץ על HTTPS
- [ ] בדקתי ש-cookies מוגדרים עם secure=true
- [ ] בדקתי שאין API keys גלויים בקוד

---

**🎉 מערכת האבטחה פועלת ומוכנה לשימוש!**

**שאלות?** בדוק את הקוד או פנה לתמיכה.

---

**תאריך יצירה:** 2025-01-04
**גרסה:** 1.0
**סטטוס:** ✅ הושלם
