# 📧 מדריך הגדרת שליחת מיילים - ארון הציוד

## סקירה כללית

המערכת משתמשת ב-**Resend** לשליחת מיילים אמיתיים:
- ✅ מיילי אימות למנהלי ערים חדשים
- 🔑 מיילי איפוס סיסמה
- 🎉 מיילי ברוכים הבאים עם פרטי התחברות

## שלב 1: יצירת חשבון ב-Resend

### 1.1 הרשמה
1. היכנס לאתר: https://resend.com
2. לחץ על "Get Started" או "Sign Up"
3. הירשם עם כתובת המייל שלך
4. אמת את כתובת המייל (תקבל מייל אימות)

### 1.2 יצירת API Key
1. לאחר התחברות, לחץ על **"API Keys"** בתפריט הצדדי
2. לחץ על **"Create API Key"**
3. תן שם למפתח (למשל: "ARON_TZIYUD_Production")
4. בחר הרשאות: **"Full Access"**
5. לחץ "Create"
6. **שמור את המפתח!** הוא יוצג רק פעם אחת

הערה: המפתח נראה כך: `re_xxxxxxxxxxxxxxxxxxxxxxxxxx`

### 1.3 אימות דומיין (אופציונלי אך מומלץ)

**חינמי - רק למבחנים:**
- אפשר להשתמש ב-`onboarding@resend.dev` בלי אימות דומיין
- מגבלות: 3,000 מיילים בחודש, רק למייל שלך

**מומלץ לייצור:**
1. לחץ על **"Domains"** בתפריט
2. לחץ על **"Add Domain"**
3. הזן את שם הדומיין שלך (למשל: `example.com`)
4. הוסף רשומות DNS לפי ההנחיות (SPF, DKIM, DMARC)
5. המתן לאימות (עד 48 שעות, לרוב כמה דקות)
6. לאחר אימות תוכל לשלוח מ-`noreply@yourdomain.com`

## שלב 2: עדכון משתני הסביבה

### 2.1 פיתוח (Development)

ערוך את הקובץ `.env.local`:

```bash
# Email Configuration (Resend)
RESEND_API_KEY=re_your_actual_api_key_here

# Email sender
EMAIL_FROM=onboarding@resend.dev
```

### 2.2 ייצור (Production - Vercel)

1. היכנס לפרויקט ב-Vercel
2. עבור ל: **Settings → Environment Variables**
3. הוסף משתנים:

| Name | Value | Environment |
|------|-------|-------------|
| `RESEND_API_KEY` | `re_your_api_key` | Production |
| `EMAIL_FROM` | `onboarding@resend.dev` | Production |
| `NEXT_PUBLIC_APP_URL` | `https://aron-tziyud.vercel.app` | Production |

4. לחץ "Save"
5. **חשוב:** Redeploy את הפרויקט לאחר שינוי משתני סביבה

## שלב 3: בדיקה

### 3.1 בדיקה מקומית (Development)

הפעל את השרת:
```bash
npm run dev
```

**ללא `RESEND_API_KEY`:**
- המיילים יודפסו ל-console
- לא יישלחו מיילים אמיתיים
- טוב למבחנים מהירים

**עם `RESEND_API_KEY`:**
- המיילים יישלחו לכתובות אמיתיות
- תראה בקונסול: `✅ Email sent successfully: [ID]`

### 3.2 בדיקת שליחת מיילים

אפשר לבדוק דרך:

#### א. יצירת מנהל חדש:
1. היכנס כ-Super Admin
2. לך ל-"ניהול משתמשים"
3. צור מנהל חדש עם כתובת מייל אמיתית
4. מייל ברוכים הבאים + אימות יישלח

#### ב. איפוס סיסמה:
1. בדף התחברות, לחץ "שכחתי סיסמה"
2. הזן מייל של מנהל קיים
3. מייל איפוס סיסמה יישלח

### 3.3 בדיקת מיילים ב-Resend Dashboard

1. היכנס ל-Resend Dashboard
2. לחץ על **"Emails"** בתפריט
3. תראה רשימה של כל המיילים ששלחת:
   - ✅ Delivered - נשלח בהצלחה
   - 📧 Sent - בתהליך שליחה
   - ❌ Failed - נכשל (בדוק שגיאות)

## שלב 4: אופטימיזציה לייצור

### 4.1 דומיין מותאם אישית (מומלץ)

אחרי שאימתת דומיין ב-Resend:

```bash
# .env.local (או Vercel)
EMAIL_FROM=noreply@yourdomain.com
```

יתרונות:
- נראה מקצועי יותר (`noreply@aron-tziyud.com`)
- שיעור הגעה (deliverability) גבוה יותר
- לא יסומן כספאם
- מוגבל רק למכסת המנוי שלך (לא 3,000/חודש)

### 4.2 תבניות מייל מותאמות

אפשר לערוך את התבניות ב-[src/lib/email.ts](src/lib/email.ts):

- `sendVerificationEmail()` - מייל אימות
- `sendPasswordResetEmail()` - איפוס סיסמה
- `sendWelcomeEmail()` - ברוכים הבאים

### 4.3 מעקב וניטור

**ב-Resend Dashboard:**
- צפה בסטטיסטיקות שליחה
- בדוק שיעור הגעה (delivery rate)
- בדוק שיעור פתיחה (open rate)
- בדוק שגיאות והחזרות (bounces)

## נקודות חשובות ⚠️

1. **אל תחשוף את ה-API Key:**
   - לעולם אל תשתף את המפתח
   - לא ב-Git, לא בקוד, רק ב-`.env.local`

2. **מכסות Resend (Free Tier):**
   - 3,000 מיילים בחודש
   - 100 מיילים ליום
   - רק מ-`onboarding@resend.dev`

3. **מכסות Resend (Paid Tier):**
   - החל מ-$20/חודש ל-50,000 מיילים
   - דומיין מותאם אישית
   - תמיכה טכנית

4. **שגיאות נפוצות:**
   - "Email service not configured" = חסר `RESEND_API_KEY`
   - "Invalid API key" = המפתח שגוי או פג תוקף
   - "Domain not verified" = השתמשת בדומיין לא מאומת

## בדיקת מצב נוכחי

```bash
# בדוק אם RESEND_API_KEY מוגדר
node -e "console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ Configured' : '❌ Not configured')"

# בדוק את EMAIL_FROM
node -e "console.log('EMAIL_FROM:', process.env.EMAIL_FROM || 'onboarding@resend.dev')"
```

## קבלת עזרה

- **תיעוד Resend:** https://resend.com/docs
- **דוגמאות קוד:** https://resend.com/docs/send-with-nextjs
- **תמיכה:** https://resend.com/support
- **סטטוס שירות:** https://status.resend.com

## סיכום מהיר 🚀

### למבחנים מהירים:
1. השאר `.env.local` ללא `RESEND_API_KEY`
2. המיילים יודפסו ל-console
3. לא צריך חשבון Resend

### לייצור אמיתי:
1. צור חשבון ב-Resend
2. קבל API Key
3. הוסף ל-`.env.local`: `RESEND_API_KEY=re_...`
4. הוסף ל-Vercel Environment Variables
5. Redeploy
6. בדוק ב-Resend Dashboard שהמיילים נשלחו

---

**הצלחה! 🎉**

אם יש בעיות, בדוק:
1. Console של Next.js לשגיאות
2. Resend Dashboard למצב המיילים
3. משתני הסביבה ב-Vercel
