# תיקון בעיות Session וזכור אותי

## הבעיות שתוקנו

### 1. משתמשים מתנתקים אחרי זמן קצר
**הבעיה**: המערכת ניתקה משתמשים אחרי שעה אחת, גם כשסימנו "זכור אותי".

**הסיבה**:
- Cookie expiry היה ארוך (8 שעות / 30 יום)
- אבל Access Token של Supabase פג תוקף אחרי שעה
- לא היה מנגנון לרענן את ה-token אוטומטית

### 2. "זכור אותי ל-30 יום" לא עבד
**הבעיה**: צריך היה להתחבר מחדש כל פעם.

**הסיבה**: ה-session לא נשמר ב-localStorage.

---

## השינויים שבוצעו

### 1. `src/lib/supabase.ts` - הגדרות Supabase Client
```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,      // רענון אוטומטי של token
    persistSession: true,         // שמירת session ב-localStorage
    detectSessionInUrl: true,     // זיהוי session מ-URL (לאיפוס סיסמה)
    storageKey: 'supabase-auth',
    storage: window.localStorage,
  },
})
```

### 2. `src/middleware.ts` - Middleware לרענון Token (חדש)
- בודק אם ה-token פג תוקף לפני כל request
- מרענן אותו אוטומטית באמצעות ה-refresh token
- מעדכן את ה-cookies החדשים
- מפנה ל-login אם הרענון נכשל

### 3. `src/hooks/useAuth.ts` - רענון פרואקטיבי
- בודק כל 50 דקות אם ה-token יפוג תוקף בעוד פחות מ-10 דקות
- מרענן אותו מראש כדי למנוע ניתוק
- מאזין לאירועים של `TOKEN_REFRESHED` ו-`SIGNED_OUT`

### 4. `src/app/api/auth/login/route.ts` - תמיכה ב-Remember Me
```typescript
const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
  email,
  password,
  options: {
    ...(rememberMe && {
      data: {
        remember_me: true
      }
    })
  }
})
```

---

## איך זה עובד עכשיו?

### תרחיש 1: משתמש סימן "זכור אותי"
1. התחברות → cookies בתוקף ל-30 יום
2. אחרי ~50 דקות → הקוד בודק אם ה-token יפוג תוקף
3. אם כן → מרענן אוטומטית לפני שפג תוקף
4. המשתמש נשאר מחובר ללא הפרעה

### תרחיש 2: משתמש לא סימן "זכור אותי"
1. התחברות → cookies בתוקף ל-8 שעות
2. רענון אוטומטי של token כל ~50 דקות
3. המשתמש נשאר מחובר עד 8 שעות
4. אחרי 8 שעות → יידרש להתחבר מחדש

### תרחיש 3: משתמש סגר את הדפדפן
- **עם "זכור אותי"**: Session נשמר ב-localStorage → מחובר גם אחרי פתיחה מחדש
- **בלי "זכור אותי"**: Session לא נשמר → יידרש להתחבר מחדש

---

## בדיקות שצריך לבצע

### ✅ בדיקה 1: רענון אוטומטי
1. התחבר למערכת (עם או בלי "זכור אותי")
2. השאר את הדפדפן פתוח למשך שעה
3. נסה לבצע פעולה במערכת
4. **תוצאה צפויה**: הפעולה עובדת ללא ניתוק

### ✅ בדיקה 2: "זכור אותי" עובד
1. התחבר עם סימון "זכור אותי"
2. סגור את הדפדפן לגמרי
3. פתח מחדש וגש לאתר
4. **תוצאה צפויה**: נשאר מחובר

### ✅ בדיקה 3: ללא "זכור אותי"
1. התחבר בלי לסמן "זכור אותי"
2. סגור את הדפדפן
3. פתח מחדש וגש לאתר
4. **תוצאה צפויה**: צריך להתחבר מחדש

### ✅ בדיקה 4: Middleware עובד
1. התחבר למערכת
2. במסוף הדפדפן, מחק את `sb-access-token` מ-cookies
3. רענן את הדף
4. **תוצאה צפויה**: ה-token מתרענן אוטומטית או מפנה ל-login

---

## Logs שימושיים

בקונסול הדפדפן תראה:
- `✅ Token refreshed automatically` - כשהרענון הצליח
- `🔄 Refreshing token proactively...` - כש-hook מרענן מראש
- `🚪 User signed out` - כשמשתמש מתנתק
- `❌ Failed to refresh token: [error]` - אם יש בעיה

---

## הגדרות נוספות ב-Supabase Dashboard

אם רוצה לשנות את זמני התוקף:

**Authentication → Settings → Session Settings:**
- `JWT Expiry Time`: כמה זמן ה-Access Token תקף (ברירת מחדל: 3600 שניות = שעה)
- `Refresh Token Rotation`: חובה שיהיה מופעל
- `Refresh Token Reuse Interval`: כמה זמן אפשר לעשות reuse של refresh token

**המלצה**: השאר את ברירות המחדל. התיקון שלנו עובד עם כל הגדרה.
