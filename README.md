# ארון ציוד ידידים

מערכת לניהול השאלות והחזרות ציוד, בנויה עם Next.js ו-Supabase.

## תכונות

### למשתמשים:
- השאלת ציוד עם טופס פשוט (שם, טלפון, בחירת ציוד)
- החזרת ציוד על פי מספר טלפון
- צפייה במלאי הציוד הזמין
- ממשק בעברית עם תמיכה ב-RTL

### למנהלים:
- פאנל ניהול מוגן בסיסמה
- ניהול מלאי (הוספה, עריכה, מחיקת ציוד)
- צפייה וניהול היסטוריית השאלות
- עדכון סטטוס השאלות
- ממשק ניהול מתקדם

## התקנה

1. התקן את התלות:
```bash
npm install
```

2. צור קובץ `.env.local` עם המשתנים הבאים:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_ADMIN_PASSWORD=your_admin_password
```

3. הגדר את בסיס הנתונים ב-Supabase:
- הפעל את הסקריפט `database.sql` בבסיס הנתונים שלך
- ודא שה-Row Level Security מוגדר כראוי

## הרצת הפרויקט

```bash
npm run dev
```

האפליקציה תהיה זמינה ב- http://localhost:3000

## מבנה הפרויקט

```
src/
├── app/
│   ├── page.tsx          # דף הבית - ממשק משתמש
│   ├── admin/
│   │   └── page.tsx      # פאנל ניהול
│   ├── layout.tsx        # Layout ראשי עם תמיכה ב-RTL
│   └── globals.css       # סטיילים גלובליים
├── components/
│   └── ui/               # רכיבי UI בסיסיים
├── lib/
│   ├── supabase.ts       # התחברות ל-Supabase
│   └── utils.ts          # פונקציות עזר
└── types/
    └── index.ts          # טיפוסי TypeScript
```

## מבנה בסיס הנתונים

### טבלת equipment
- id (UUID, Primary Key)
- name (Text) - שם הציוד
- quantity (Integer) - כמות זמינה
- created_at, updated_at (Timestamps)

### טבלת borrow_history
- id (UUID, Primary Key)
- name (Text) - שם המשתמש
- phone (Text) - מספר טלפון
- equipment_id (UUID, Foreign Key)
- equipment_name (Text) - שם הציוד
- borrow_date (Timestamp) - תאריך השאלה
- return_date (Timestamp, Optional) - תאריך החזרה
- status (Text) - 'borrowed' או 'returned'
- created_at, updated_at (Timestamps)

## אבטחה

- הפאנל המנהל מוגן בסיסמה
- Row Level Security ב-Supabase להגנה על הנתונים
- ולידציה של קלט בצד הלקוח והשרת

## טכנולוגיות

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **UI Components**: Radix UI, Lucide React
- **Language**: Hebrew (RTL support)
