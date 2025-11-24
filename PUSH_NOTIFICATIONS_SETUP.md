# הגדרת התראות Push - מדריך מלא

## מצב נוכחי: מה כבר קיים?

### ✅ קבצים שכבר קיימים:
1. **Service Worker** (`public/sw.js`) - מטפל בהתראות
2. **PWA Manifest** (`public/manifest.json`) - הגדרות PWA
3. **Push API Endpoints** - subscribe/send routes

### 📝 קבצים שנוצרו עכשיו:
1. **SQL Schema** (`create-push-subscriptions-table.sql`) - טבלת subscriptions
2. **Push Manager** (`src/lib/push-notifications.ts`) - ניהול התראות בצד client
3. **UI Component** (`src/components/NotificationSettings.tsx`) - ממשק להפעלת התראות

---

## 🚀 שלבי ההתקנה

### שלב 1: התקנת חבילת web-push

```bash
npm install web-push
```

### שלב 2: יצירת VAPID Keys

הרץ את הפקודה הבאה ליצירת מפתחות:

```bash
npx web-push generate-vapid-keys
```

תקבל פלט דומה לזה:
```
Public Key:
BKxj...xyz

Private Key:
abc...123
```

### שלב 3: הוספת משתני סביבה

הוסף ל-`.env.local`:

```env
# VAPID Keys for Web Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<Public Key מהשלב הקודם>
VAPID_PRIVATE_KEY=<Private Key מהשלב הקודם>
VAPID_SUBJECT=mailto:aronyedidim@gmail.com
```

**חשוב**: הוסף גם ל-Vercel Environment Variables!

### שלב 4: יצירת הטבלה ב-Supabase

1. פתח את Supabase Dashboard
2. לך ל-SQL Editor
3. העתק והרץ את התוכן של `create-push-subscriptions-table.sql`
4. ודא שהטבלה נוצרה: `push_subscriptions`

### שלב 5: הוספת Component להגדרות משתמש

בעמוד ההגדרות של מנהלי הערים (`src/app/city/page.tsx` או דומה), הוסף:

```tsx
import NotificationSettings from '@/components/NotificationSettings'

// בתוך הקומפוננטה:
<NotificationSettings />
```

### שלב 6: אתחול Service Worker

בעמוד הראשי של האפליקציה (`src/app/layout.tsx` או דף ראשי אחר), הוסף:

```tsx
'use client'

import { useEffect } from 'react'
import { initializePushNotifications } from '@/lib/push-notifications'

export default function Layout({ children }) {
  useEffect(() => {
    // Initialize push notifications for logged-in users
    initializePushNotifications()
  }, [])

  return <>{children}</>
}
```

---

## 📤 שליחת התראות

### דרך 1: שליחה ידנית דרך API

```typescript
const response = await fetch('/api/push/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    cityId: 'city-uuid-here',
    title: 'בקשה חדשה!',
    body: 'יש בקשה חדשה להשאלת ציוד',
    url: '/city/requests',
  }),
})
```

### דרך 2: אוטומטית בעת יצירת בקשה

ב-`src/app/api/city/requests/route.ts` (או איפה ששומרים בקשות חדשות), הוסף:

```typescript
// After creating the request:
const { sendPushNotification } = await import('@/lib/push-server')

await sendPushNotification({
  cityId: request.city_id,
  title: 'בקשה חדשה להשאלת ציוד',
  body: `${requesterName} ביקש להשאיל ציוד`,
  url: `/city/requests?id=${request.id}`,
})
```

---

## 🔧 קוד Server-Side לשליחת התראות

צור קובץ `src/lib/push-server.ts`:

```typescript
import webpush from 'web-push'
import { createServiceClient } from './supabase-server'

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function sendPushNotification({
  cityId,
  title,
  body,
  url,
}: {
  cityId: string
  title: string
  body: string
  url: string
}) {
  const supabase = createServiceClient()

  // Get all active subscriptions for managers of this city
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('city_id', cityId)
    .eq('role', 'city_manager')
    .eq('is_active', true)

  if (!users || users.length === 0) {
    console.log('No active managers found for city:', cityId)
    return
  }

  const userIds = users.map(u => u.id)

  // Get subscriptions
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', userIds)
    .eq('is_active', true)

  if (!subscriptions || subscriptions.length === 0) {
    console.log('No active push subscriptions found')
    return
  }

  // Send push notification to each subscription
  const promises = subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        JSON.stringify({
          title,
          body,
          icon: '/icon-192.png',
          badge: '/badge-72.png',
          url,
          cityId,
        })
      )

      // Update last_used_at
      await supabase
        .from('push_subscriptions')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', sub.id)

      console.log('✅ Push sent to:', sub.endpoint)
    } catch (error: any) {
      console.error('❌ Failed to send push:', error)

      // If subscription is invalid, mark as inactive
      if (error.statusCode === 410 || error.statusCode === 404) {
        await supabase
          .from('push_subscriptions')
          .update({ is_active: false })
          .eq('id', sub.id)
      }
    }
  })

  await Promise.all(promises)
}
```

---

## ✅ בדיקות

### בדיקה 1: רישום ה-Service Worker
1. פתח את האפליקציה
2. פתח DevTools → Application → Service Workers
3. ודא שיש רשום: `sw.js` (Status: Activated)

### בדיקה 2: הרשאות התראות
1. לחץ על "הפעל התראות" בהגדרות
2. ודא שמופיעה בקשת הרשאה מהדפדפן
3. אפשר התראות

### בדיקה 3: שליחת התראת בדיקה
במסוף DevTools:

```javascript
fetch('/api/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    cityId: 'YOUR_CITY_ID',
    title: 'התראת בדיקה',
    body: 'זו התראת בדיקה!',
    url: '/',
  }),
})
```

### בדיקה 4: התראה כשהאפליקציה סגורה
1. סגור את הטאב של האפליקציה
2. שלח התראה (דרך API או על ידי יצירת בקשה)
3. ודא שההתראה מופיעה במערכת ההפעלה

---

## 🐛 פתרון בעיות נפוצות

### "VAPID public key not configured"
- ודא ש-`NEXT_PUBLIC_VAPID_PUBLIC_KEY` מוגדר ב-`.env.local`
- ודא שהמפתח מתחיל ב-`B` ואורכו 88 תווים

### "Service Worker registration failed"
- ודא שהקובץ `public/sw.js` קיים
- ודא ש-HTTPS מופעל (או localhost)

### "Push subscription failed"
- בדוק שההרשאות לא נחסמו בדפדפן
- נסה למחוק cookies ולהתחבר מחדש

### התראות לא מגיעות
- ודא שהטבלה `push_subscriptions` נוצרה
- בדוק שיש רשומות בטבלה
- ודא שה-VAPID keys זהים בשרת וב-client

---

## 📱 תמיכה בדפדפנים

| דפדפן | Desktop | Mobile |
|-------|---------|--------|
| Chrome | ✅ | ✅ |
| Edge | ✅ | ✅ |
| Firefox | ✅ | ✅ |
| Safari | ✅ (16.4+) | ✅ (16.4+) |
| Opera | ✅ | ✅ |

**הערה**: Safari תומך בהתראות רק מגרסה 16.4 ומעלה.

---

## 🔒 אבטחה

- ✅ RLS מופעל על טבלת `push_subscriptions`
- ✅ משתמשים רואים רק את ה-subscriptions שלהם
- ✅ VAPID private key לא חשוף ל-client
- ✅ Authentication נדרשת לכל ה-endpoints

---

## 📊 ניטור

### שאילתות שימושיות:

**כמה subscriptions פעילים?**
```sql
SELECT COUNT(*) FROM push_subscriptions WHERE is_active = true;
```

**subscriptions לפי משתמש:**
```sql
SELECT u.email, COUNT(ps.id) as subscription_count
FROM users u
LEFT JOIN push_subscriptions ps ON ps.user_id = u.id AND ps.is_active = true
GROUP BY u.email
ORDER BY subscription_count DESC;
```

**ניקוי subscriptions ישנים (מעל 90 יום):**
```sql
UPDATE push_subscriptions 
SET is_active = false 
WHERE last_used_at < NOW() - INTERVAL '90 days';
```

