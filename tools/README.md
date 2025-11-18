# כלי עזר למערכת ארון ציוד

תיקייה זו מכילה כלים עזר לניהול המערכת.

## 🖼️ ניהול תמונות Google Drive

### 1. `google-drive-url-converter.html`
**מטרה**: המרת קישורי Google Drive לקישורים ישירים לתמונות

**שימוש**:
1. פתח את הקובץ בדפדפן
2. הדבק קישור מ-Google Drive
3. קבל קישור ישיר לשימוש באתר

**דוגמה**:
- **קלט**: `https://drive.google.com/file/d/1ABC123xyz/view?usp=sharing`
- **פלט**: `https://drive.google.com/thumbnail?id=1ABC123xyz&sz=w1000`

---

### 2. `download-equipment-images.html`
**מטרה**: הורדת כל תמונות הציוד מ-Supabase Storage

**שימוש**:
1. פתח את הקובץ בדפדפן
2. לחץ "הורד את כל התמונות"
3. כל 22 התמונות ירדו למחשב

**מתי להשתמש**: לפני מעבר ל-Google Drive

---

### 3. `list-equipment-images.js`
**מטרה**: רשימת כל תמונות הציוד ב-Supabase

**שימוש**:
```bash
node list-equipment-images.js
```

**תוצאה**:
- רשימת כל הקבצים ב-Storage
- רשימת פריטים במסד הנתונים עם URLs
- סטטיסטיקות (גודל, כמות)

---

### 4. `delete-equipment-images-from-storage.js`
**מטרה**: מחיקת כל תמונות הציוד מ-Supabase Storage

**⚠️ אזהרה**: השתמש רק אחרי שעדכנת את כל ה-URLs ל-Google Drive!

**שימוש**:
```bash
node delete-equipment-images-from-storage.js
```

**תוצאה**:
- מחיקת 22 קבצי תמונות
- חיסכון של ~2.13 MB
- **לא ממחק** URLs במסד הנתונים

---

### 5. `equipment-images-to-upload.csv`
**מטרה**: רשימת כל התמונות למעקב

**שימוש**: קובץ CSV לעקוב אחרי איזה תמונות הועלו ל-Google Drive

---

## 📋 תהליך מעבר ל-Google Drive

1. **הורד תמונות**: `download-equipment-images.html`
2. **העלה ל-Drive**: העלה את כל התמונות לתיקייה ייעודית
3. **קבל קישורים**: לכל תמונה → לחץ ימין → שתף → העתק קישור
4. **המר קישורים**: `google-drive-url-converter.html`
5. **עדכן במערכת**: הדבק קישורים בפאנל ניהול
6. **מחק מ-Storage**: `delete-equipment-images-from-storage.js`

---

## 🔒 דרישות

כל הסקריפטים דורשים משתני סביבה:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

הגדר אותם לפני הרצה:
```bash
set NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 📌 הערות

- **תמונות קטגוריות**: הכלים **לא נוגעים** בתמונות קטגוריות - רק ציוד
- **גיבוי**: כל הת מונות כבר ב-Google Drive לפני מחיקה
- **מסד נתונים**: ה-URLs נשארים במסד הנתונים - רק הקבצים נמחקים
