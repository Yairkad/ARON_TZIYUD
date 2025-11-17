# 🗺️ הוראות הפעלת מפת הארונות

## שלב 1: הוסף עמודות למסד הנתונים

1. פתח את [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql/new)
2. העתק והרץ את הקוד הבא:

```sql
ALTER TABLE public.cities
  ADD COLUMN IF NOT EXISTS public_lat DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS public_lng DECIMAL(11, 8);

COMMENT ON COLUMN public.cities.public_lat IS 'Approximate latitude for map display to regular users (~750m accuracy)';
COMMENT ON COLUMN public.cities.public_lng IS 'Approximate longitude for map display to regular users (~750m accuracy)';
```

3. לחץ על "Run" או Ctrl+Enter

## שלב 2: הוסף מיקומים משוערים

אחרי שהעמודות נוספו, הרץ:

```bash
node add-public-locations.js
```

הסקריפט הזה יוסיף אוטומטית מיקום משוער (±750 מטר) לכל ערי המערכת,
מבוסס על המיקום המדויק הקיים.

## שלב 3: בדוק את המפה

1. וודא שהשרת רץ: http://localhost:3000
2. עבור למפת הארונות: http://localhost:3000/cabinets-map
3. תראה עיגולים כחולים סביב כל ארון

## 🎉 זהו! המפה מוכנה

### טיפים נוספים:

- **לבדוק אילו ערים יש**: `node check-cities.js`
- **לעדכן ידנית**: ערוך בSupabase SQL Editor
- **לראות את המפה**: http://localhost:3000/cabinets-map

### מה קורה במפה?

- משתמשים רגילים רואים רק עיגול של 750 מטר
- לחיצה על העיגול מנווטת למסך הבקשה
- רק משתמשים עם טוקן מאושר מקבלים מיקום מדויק
