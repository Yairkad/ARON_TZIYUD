# תכונה חדשה: עדכון פרטי עיר על ידי מנהל העיר

## סקירה

תכונה זו מאפשרת למנהל כל עיר לעדכן את פרטי הקשר וכתובת הארון באופן עצמאי, מבלי להיות תלוי במנהל הראשי. כל שינוי ישלח התראה למנהל הראשי.

---

## מה נוסף?

### 1. טבלת התראות במסד הנתונים

נוצרה טבלה חדשה `admin_notifications` ב-Supabase:

```sql
CREATE TABLE public.admin_notifications (
    id UUID PRIMARY KEY,
    city_id UUID REFERENCES cities(id),
    city_name TEXT,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP
)
```

**איך להפעיל:**
1. פתח את Supabase Dashboard
2. עבור ל-SQL Editor
3. הרץ את הקובץ `create-notifications-table.sql`

---

### 2. טופס עדכון פרטים בממשק הניהול

בטאב "הגדרות" של כל עיר, נוסף טופס חדש שמאפשר למנהל לעדכן:

#### שדות חובה:
- **שם מנהל ראשון**
- **טלפון מנהל ראשון** (10 ספרות, מתחיל ב-05)

#### שדות אופציונליים:
- **שם מנהל שני**
- **טלפון מנהל שני** (10 ספרות, מתחיל ב-05)
- **כתובת ארון** (קישור Google Maps)

---

### 3. התראות למנהל ראשי

כאשר מנהל עיר משנה פרטים:
1. השינויים נשמרים בטבלת `cities`
2. נוצרת התראה חדשה בטבלת `admin_notifications`
3. ההתראה כוללת:
   - שם העיר
   - רשימת השדות שהשתנו
   - תאריך ושעה

**דוגמה להודעת התראה:**
```
עודכנו פרטי העיר: טלפון מנהל ראשון, כתובת ארון
```

---

## איך זה עובד?

### מצד מנהל העיר:

1. מנהל העיר נכנס לפאנל הניהול שלו (`/city/[cityId]/admin`)
2. עובר לטאב "הגדרות"
3. רואה טופס עם הפרטים הנוכחיים של העיר
4. עורך את הפרטים הרצויים
5. לוחץ על "שמור שינויים"
6. מקבל אישור: "הפרטים עודכנו בהצלחה!"

### מצד המנהל הראשי:

1. המנהל הראשי יוכל לראות התראות בפאנל שלו (`/super-admin`)
2. ההתראות יוצגו עם:
   - שם העיר שעדכנה פרטים
   - תיאור השינוי
   - תאריך ושעה
   - סטטוס "נקרא"/"לא נקרא"

---

## Validation (וולידציה)

### טלפונים:
- חייבים להיות בדיוק 10 ספרות
- חייבים להתחיל ב-`05`
- פורמט: `05XXXXXXXX`

### שדות חובה:
- שם מנהל ראשון - לא יכול להיות ריק
- טלפון מנהל ראשון - לא יכול להיות ריק

### שדות אופציונליים:
- אם ממלאים טלפון מנהל שני, חייב לעמוד בולידציה
- אם לא ממלאים - נשמר כ-`null`

---

## הוספת תצוגת התראות למנהל הראשי (עתידי)

כרגע הקוד יוצר התראות בטבלה. בשלב הבא צריך להוסיף:

### 1. הצגת התראות בדף Super Admin

```typescript
// Fetch notifications
const [notifications, setNotifications] = useState<AdminNotification[]>([])

const fetchNotifications = async () => {
  const { data } = await supabase
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false })

  setNotifications(data || [])
}
```

### 2. UI להצגת התראות

הצע תיבת התראות בראש הדף:

```tsx
{/* Notifications Badge */}
<div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
  <div className="flex items-center gap-2">
    <span className="text-2xl">🔔</span>
    <div>
      <h3 className="font-bold text-gray-800">
        יש לך {notifications.filter(n => !n.is_read).length} התראות חדשות
      </h3>
      {notifications.slice(0, 3).map(notification => (
        <div key={notification.id} className="text-sm text-gray-700">
          • {notification.city_name}: {notification.message}
        </div>
      ))}
    </div>
  </div>
</div>
```

### 3. סימון התראות כנקראו

```typescript
const markAsRead = async (notificationId: string) => {
  await supabase
    .from('admin_notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  fetchNotifications()
}
```

---

## יתרונות התכונה

✅ **עצמאות למנהלי ערים** - יכולים לעדכן פרטים בעצמם
✅ **שקיפות למנהל ראשי** - מקבל התראות על כל שינוי
✅ **ביקורת (Audit Trail)** - כל שינוי נשמר עם תאריך ושעה
✅ **מניעת טעויות** - ולידציה על שדות חובה ופורמט טלפון
✅ **UX משופר** - מנהלים לא צריכים לחכות למנהל ראשי

---

## קבצים שהשתנו

1. **src/app/city/[cityId]/admin/page.tsx**
   - נוסף state `editCityForm`
   - נוספה פונקציה `handleUpdateCityDetails`
   - נוסף UI לטופס עדכון פרטים

2. **src/types/index.ts**
   - נוסף interface `AdminNotification`

3. **create-notifications-table.sql** (קובץ חדש)
   - SQL ליצירת טבלת ההתראות

4. **CITY_DETAILS_UPDATE_FEATURE.md** (קובץ זה)
   - תיעוד התכונה

---

## הרצת SQL ב-Supabase

**חשוב!** לפני שהתכונה תעבוד, חייב להריץ את ה-SQL:

```bash
1. כנס ל-Supabase Dashboard
2. בחר את הפרויקט
3. לחץ על SQL Editor
4. פתח את create-notifications-table.sql
5. העתק והדבק
6. לחץ RUN
7. ודא שהטבלה נוצרה: SELECT * FROM admin_notifications;
```

---

## בדיקה

### בדיקת העדכון:
1. היכנס כמנהל עיר
2. עבור להגדרות
3. שנה טלפון או שם מנהל
4. לחץ "שמור שינויים"
5. וודא הודעה: "הפרטים עודכנו בהצלחה!"

### בדיקת ההתראה:
1. בדוק ב-Supabase:
```sql
SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT 5;
```

2. וודא שנוצרה רשומה עם:
   - city_id נכון
   - city_name נכון
   - message מתאים
   - is_read = false

---

## שיפורים עתידיים

1. **ממשק התראות למנהל ראשי**
   - תיבת התראות בדף super-admin
   - סימון "נקרא"/"לא נקרא"
   - מחיקת התראות ישנות

2. **התראות בזמן אמת**
   - שימוש ב-Supabase Realtime
   - התראות push

3. **היסטוריית שינויים**
   - לוג מפורט של כל שינוי
   - מי ביצע, מתי, מה השתנה

4. **אישור שינויים**
   - אפשרות למנהל ראשי לאשר/לדחות שינויים
   - שינויים ממתינים לאישור

---

## תמיכה

אם יש בעיות:
1. בדוק שהטבלה נוצרה ב-Supabase
2. בדוק RLS policies
3. בדוק console בדפדפן (F12)
4. בדוק Supabase logs

**בהצלחה! 🎉**
