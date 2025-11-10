# 🔔 הגדרת Web Push Notifications

## תיאור
המערכת תומכת ב-Web Push Notifications כך שמנהלי ערים יקבלו התראות על בקשות חדשות גם כשהם לא בתוך האתר.

## דרישות מקדימות
1. HTTPS (Vercel מספק זאת אוטומטית)
2. דפדפן תומך (Chrome, Firefox, Edge, Safari 16.4+)
3. מפתחות VAPID

## 🔑 יצירת מפתחות VAPID

### שלב 1: התקנת web-push (אם עוד לא מותקן)
```bash
npm install web-push
```

### שלב 2: יצירת מפתחות
```bash
npx web-push generate-vapid-keys
```

הפקודה תחזיר משהו כזה:
```
Public Key:
BEl62iUYgUivxIkv69yViEuiBIa-Ib27SDbQjaDTbVJWoN9gUFeldHqnX_-j1xhGqZ8jQBLYchQ8FxjhU2G-K1k

Private Key:
nGEP7Y3kZWZZjKqN7tLQYf5kL9s8hZWGP3_t7xK6k1Q
```

### שלב 3: הוספה ל-.env.local
הוסף את המפתחות לקובץ `.env.local`:

```bash
# Web Push Notifications (VAPID Keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib27SDbQjaDTbVJWoN9gUFeldHqnX_-j1xhGqZ8jQBLYchQ8FxjhU2G-K1k
VAPID_PRIVATE_KEY=nGEP7Y3kZWZZjKqN7tLQYf5kL9s8hZWGP3_t7xK6k1Q
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

**חשוב:**
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - ציבורי, נשלח ללקוח
- `VAPID_PRIVATE_KEY` - פרטי, רק בשרת!  **לא לשתף!**
- `NEXT_PUBLIC_APP_URL` - ה-URL של האתר שלך

### שלב 4: הוספה ל-Vercel Environment Variables
1. עבור ל-Vercel Dashboard
2. בחר את הפרויקט
3. Settings → Environment Variables
4. הוסף את 3 המשתנים:
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `NEXT_PUBLIC_APP_URL`
5. Redeploy את הפרויקט

## 📊 הרצת Migration ל-Database

הרץ את ה-migration ב-Supabase:

```sql
-- הקובץ נמצא ב: supabase/migrations/add-push-subscriptions.sql
```

או העתק את התוכן לכלי ה-SQL Editor ב-Supabase Dashboard.

## 🚀 שימוש

### למנהלי ערים:
1. כנס לפאנל הניהול של העיר
2. לחץ על כפתור **"הפעל התראות"** (יופיע רק במצב בקשות)
3. אשר את ההרשאה בדפדפן
4. מעכשיו תקבל התראות על בקשות חדשות!

### איך זה עובד?
1. משתמש שולח בקשה לציוד
2. המערכת יוצרת את הבקשה בדאטאבייס
3. המערכת שולחת Push Notification לכל המנהלים שהפעילו התראות באותה עיר
4. המנהל מקבל התראה במכשיר שלו (גם אם האתר סגור!)
5. לחיצה על ההתראה פותחת את דף הבקשות

## 🔧 קבצים שנוצרו

### Frontend:
- `src/lib/push.ts` - פונקציות עזר לניהול push
- `src/app/city/[cityId]/admin/page.tsx` - כפתור התראות בדף המנהל

### Backend:
- `src/app/api/push/subscribe/route.ts` - הרשמה/ביטול מהתראות
- `src/app/api/push/send/route.ts` - שליחת התראות
- `src/app/api/requests/create/route.ts` - שליחת push כשיש בקשה חדשה

### Service Worker:
- `public/sw.js` - Service Worker לטיפול בהתראות
- `public/manifest.json` - PWA manifest

### Database:
- `supabase/migrations/add-push-subscriptions.sql` - טבלת subscriptions

## 🎯 תכונות

✅ התראות אוטומטיות על בקשות חדשות
✅ עובד גם כש-PWA לא פתוח
✅ תמיכה מלאה בכל הדפדפנים המודרניים
✅ אפשרות להפעיל/לכבות התראות בקלות
✅ ניקוי אוטומטי של subscriptions לא פעילים

## 🐛 Troubleshooting

### ההתראות לא עובדות?
1. וודא ש-VAPID keys מוגדרים ב-.env
2. וודא שהאתר רץ על HTTPS
3. בדוק שההרשאות לא נחסמו בדפדפן
4. בדוק ב-Console שאין שגיאות
5. וודא שה-Service Worker נרשם בהצלחה (DevTools → Application → Service Workers)

### איך לבדוק שה-Service Worker פעיל?
1. פתח DevTools (F12)
2. Application → Service Workers
3. תראה `sw.js` ברשימה עם סטטוס "activated"

### איך לבדוק subscription?
1. פתח DevTools Console
2. הרץ:
```javascript
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Subscription:', sub)
  })
})
```

## 📱 PWA Support

המערכת תומכת ב-PWA! המשתמשים יכולים להתקין את האפליקציה על המכשיר וההתראות יעבדו כמו באפליקציה רגילה.

### התקנת PWA:
- **Chrome/Edge Desktop**: לחץ על אייקון ההתקנה בשורת הכתובת
- **Chrome Android**: "Add to Home Screen" מהתפריט
- **Safari iOS 16.4+**: Share → Add to Home Screen

---

**🎉 מערכת ההתראות מוכנה! המנהלים יקבלו עדכונים בזמן אמת על בקשות חדשות.**
