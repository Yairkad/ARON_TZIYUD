# 🛡️ הוראות Backup לפני Migration

## למה צריך Backup?
למרות שה-Migration **רק מוסיף ולא מוחק**, תמיד טוב להיות בטוחים!

---

## דרך 1: Backup דרך Supabase Dashboard (הכי קל)

### שלב 1: Export הנתונים
1. היכנס ל-Supabase Dashboard
2. לך ל: `Database` → `Backups`
3. לחץ על `Create backup` או `Download backup`
4. שמור את הקובץ במקום בטוח

---

## דרך 2: Export טבלאות ידני (מומלץ)

### שלב 1: Export טבלת Cities
```sql
-- הרץ ב-SQL Editor:
COPY (SELECT * FROM public.cities) TO STDOUT WITH CSV HEADER;
```
שמור את הפלט בקובץ: `cities_backup_20251111.csv`

### שלב 2: Export טבלת Equipment
```sql
COPY (SELECT * FROM public.equipment) TO STDOUT WITH CSV HEADER;
```
שמור: `equipment_backup_20251111.csv`

### שלב 3: Export טבלת Borrow History
```sql
COPY (SELECT * FROM public.borrow_history) TO STDOUT WITH CSV HEADER;
```
שמור: `borrow_history_backup_20251111.csv`

---

## דרך 3: Full Database Dump (המקיף ביותר)

אם יש לך גישה ל-pg_dump:

```bash
pg_dump \
  --host=db.jgkmcsxrtovrdiguhwyv.supabase.co \
  --port=5432 \
  --username=postgres \
  --format=custom \
  --file=full_backup_20251111.dump \
  postgres
```

---

## איך לשחזר Backup? (אם משהו ישתבש)

### אם שמרת CSV:
```sql
-- מחק נתונים שגויים (אם יש):
TRUNCATE public.cities CASCADE;

-- שחזר מה-CSV:
COPY public.cities FROM '/path/to/cities_backup_20251111.csv' WITH CSV HEADER;
```

### אם שמרת .dump:
```bash
pg_restore \
  --host=db.jgkmcsxrtovrdiguhwyv.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  full_backup_20251111.dump
```

---

## ✅ Checklist לפני Migration:

- [ ] שמרתי backup של טבלת cities
- [ ] שמרתי backup של טבלת equipment
- [ ] יש לי גישה ל-Supabase Dashboard
- [ ] יש לי את הסיסמאות לכניסה
- [ ] קראתי את ה-Migration ובדקתי שאין DROP TABLE

---

## 🔒 בטיחות נוספת:

אם אתה רוצה להיות **סופר בטוח**, תוכל להריץ את ה-Migration על **Supabase Project חדש** קודם, לבדוק שהכל עובד, ורק אז להריץ על הפרויקט האמיתי.

---

## ⚠️ Important: מה ה-Migration לא עושה?

❌ לא מוחק טבלאות
❌ לא מוחק עמודות
❌ לא מוחק שורות
❌ לא משנה נתונים קיימים

✅ רק מוסיף טבלאות חדשות
✅ רק מוסיף policies (הרשאות)
✅ רק מוסיף פונקציות

**אין DROP, אין DELETE, אין TRUNCATE במיגרציה!**
