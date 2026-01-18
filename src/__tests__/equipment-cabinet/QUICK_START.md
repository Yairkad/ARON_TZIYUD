# התחלה מהירה - הרצת בדיקות

## ⚡ הפקודות החשובות ביותר

### הרץ את כל הבדיקות:
```bash
npm test src/__tests__/equipment-cabinet
```

### הרץ בדיקה ספציפית:
```bash
# בדיקות אבטחה
npm test rls-policies

# בדיקות API בקשות
npm test api-requests

# בדיקות API ציוד
npm test api-city-equipment

# בדיקות פונקציות עזר
npm test utility-functions

# בדיקות אינטגרציה
npm test integration-workflow
```

### מצב מעקב (מריץ מחדש אוטומטית כשיש שינויים):
```bash
npm test -- --watch src/__tests__/equipment-cabinet
```

### דוח כיסוי (coverage report):
```bash
npm test -- --coverage src/__tests__/equipment-cabinet
```

## 🔍 בדיקת בדיקה אחת ספציפית

אם אתה רוצה להריץ רק בדיקה אחת בתוך קובץ, השתמש ב-`it.only`:

```typescript
it.only('should allow system to insert activity logs', async () => {
  // רק הבדיקה הזו תרוץ
})
```

או דלג על בדיקה עם `it.skip`:

```typescript
it.skip('should allow system to insert activity logs', async () => {
  // הבדיקה הזו תדולג
})
```

## 📊 קריאת התוצאות

### ✅ הצלחה - יראה ככה:
```
PASS  src/__tests__/equipment-cabinet/rls-policies.test.ts
  ✓ should allow system to insert activity logs (45ms)
  ✓ should allow authenticated users to view logs (23ms)

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
```

### ❌ כשלון - יראה ככה:
```
FAIL  src/__tests__/equipment-cabinet/rls-policies.test.ts
  ✕ should allow system to insert activity logs (45ms)

  ● should allow system to insert activity logs

    expect(received).toBeNull()

    Received: { code: '42501', message: 'permission denied' }
```

## 🐛 פתרון בעיות נפוצות

### שגיאה: "Cannot find module '@/lib/token'"
**פתרון:** ודא ש-`jest.config.js` מוגדר עם `moduleNameMapper`

### שגיאה: "SUPABASE_SERVICE_ROLE_KEY is not defined"
**פתרון:** הוסף את המשתנה ל-`.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=your-service-key-here
```

### שגיאה: "Connection timeout"
**פתרון:** ודא שיש חיבור לאינטרנט ו-Supabase פעיל

### הבדיקות לוקחות הרבה זמן
**פתרון:** הרץ רק בדיקה ספציפית במקום כולן

## 📝 טיפים

1. **הרץ בדיקות לפני commit:** תמיד הרץ את הבדיקות לפני לעשות commit
   ```bash
   npm test src/__tests__/equipment-cabinet && git commit
   ```

2. **דבאג בדיקה:** הוסף `console.log` בבדיקה כדי לראות מה קורה
   ```typescript
   it('should do something', async () => {
     const result = await someFunction()
     console.log('Result:', result) // 👈 זה יודפס
     expect(result).toBe(true)
   })
   ```

3. **הרץ רק בדיקות שנכשלו:** אחרי הרצה, Jest מציע להריץ רק את מה שנכשל
   ```bash
   npm test -- --onlyFailures
   ```

## 🎯 הבדיקות החשובות ביותר

אם אין זמן להריץ הכל, הרץ לפחות את אלה:

1. **בדיקות אבטחה (חובה!):**
   ```bash
   npm test rls-policies
   ```

2. **בדיקות תהליך השאלה מלא:**
   ```bash
   npm test integration-workflow
   ```

3. **בדיקות טוקנים (חשוב לאבטחה):**
   ```bash
   npm test utility-functions
   ```

---

💡 **זכור:** הבדיקות הן החברים הכי טובים שלך - הם מוודאים שהקוד עובד ושלא שברת משהו!
