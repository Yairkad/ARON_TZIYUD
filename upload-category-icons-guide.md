# מדריך העלאת אייקוני קטגוריות

## בעיה: שמות קבצים בעברית
Supabase Storage לא תומך בשמות קבצים בעברית ב-URL. צריך להשתמש בשמות באנגלית.

## פתרון 1: שנה שמות לפני העלאה

לפני שאתה מעלה את התמונות, שנה להם שמות באנגלית:

| קטגוריה | שם הקובץ המומלץ |
|---------|-----------------|
| פנצ'ר | `tire.png` |
| התנעה | `battery.png` |
| דלק | `fuel.png` |
| ספריי | `spray.png` |
| דלת טרוקה | `locked-door.png` |
| פתיחה | `unlock.png` |
| דלק/שמן/מים | `fluids.png` |
| סיירת | `patrol.png` |
| כלי עבודה כלליים | `tools.png` |
| בטיחות | `safety.png` |
| ג'יפים | `jeeps.png` |
| אחר/שונות | `other.png` |

## פתרון 2: השתמש בספרות

אם קשה לך לזכור, תן שמות לפי מספרים:

```
category-1.png  → פנצ'ר
category-2.png  → התנעה
category-3.png  → דלק
... וכו'
```

## שלבי ההעלאה:

1. **שנה שמות לקבצים** לשמות באנגלית
2. **העלה ל-Supabase Storage**: https://supabase.com/dashboard/project/jgkmcsxrtovrdiguhwyv/storage/buckets/category-icons
3. **לחץ על כל תמונה** כדי לקבל את ה-URL
4. **העתק את ה-URL** - הוא ייראה כך:
   ```
   https://jgkmcsxrtovrdiguhwyv.supabase.co/storage/v1/object/public/category-icons/tire.png
   ```
5. **עדכן את הטבלה** ב-SQL Editor:
   ```sql
   ALTER TABLE equipment_categories ADD COLUMN IF NOT EXISTS icon TEXT;

   UPDATE equipment_categories SET icon = 'https://jgkmcsxrtovrdiguhwyv.supabase.co/storage/v1/object/public/category-icons/tire.png' WHERE name = 'פנצ''ר';
   -- המשך לכל הקטגוריות...
   ```

## אם יש בעיה בהעלאה
- **גודל הקובץ**: עד 2MB
- **סוגי קבצים מותרים**: PNG, JPG, JPEG, SVG, WEBP
- **שם הקובץ**: אותיות אנגליות, מספרים, מקף (-), קו תחתון (_) בלבד
