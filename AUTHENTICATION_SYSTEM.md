# 🔐 מערכת האימות והאבטחה - תיעוד מלא

## סקירה כללית

מערכת אימות מתקדמת עם Supabase Auth המאפשרת:
- ✅ **Email + Password authentication**
- ✅ **הרשאות מבוססות תפקידים** (Role-Based Access Control)
- ✅ **הרשאות מפורטות** (Granular Permissions)
- ✅ **Row Level Security** (RLS) ברמת מסד הנתונים
- ✅ **משתמש נפרד לכל מנהל** עם audit trail מדויק
- ✅ **Dual Mode** - תמיכה בשיטה ישנה וחדשה במקביל

---

## 🎭 תפקידים והרשאות

### תפקידים (Roles):

#### 1. **Super Admin** (מנהל ראשי)
```typescript
role: 'super_admin'
permissions: 'full_access' (קבוע)
city_id: null
```

**יכולות:**
- ✅ גישה לכל הערים
- ✅ יצירת/עריכה/מחיקת ערים
- ✅ ניהול משתמשים (הוספה/הסרה/עריכת הרשאות)
- ✅ צפייה בכל הנתונים ו-logs
- ✅ שינוי הגדרות מערכת

#### 2. **City Manager** (מנהל עיר)
```typescript
role: 'city_manager'
permissions: 'view_only' | 'approve_requests' | 'full_access'
city_id: <UUID של העיר>
```

**3 רמות הרשאה:**

##### **A. View Only (צפייה בלבד)** 👁️
```typescript
permissions: 'view_only'
```
- ✅ צפייה בציוד של העיר
- ✅ צפייה בהיסטוריית השאלות
- ✅ צפייה בבקשות
- ❌ אין אישור בקשות
- ❌ אין הוספה/עריכה של ציוד
- ❌ אין מחיקה

**שימוש:** מתאים למנהל משני שרק צריך לעקוב אחרי הציוד

##### **B. Approve Requests (אישור בקשות)** ✅
```typescript
permissions: 'approve_requests'
```
- ✅ כל ההרשאות של View Only
- ✅ אישור/דחיית בקשות ציוד
- ✅ עדכון סטטוס בקשות
- ❌ אין הוספה/עריכת ציוד
- ❌ אין מחיקה

**שימוש:** מתאים למנהל שמטפל בבקשות אבל לא מנהל את המלאי

##### **C. Full Access (גישה מלאה)** 🔓
```typescript
permissions: 'full_access'
```
- ✅ כל ההרשאות של Approve Requests
- ✅ הוספת ציוד חדש
- ✅ עריכת ציוד קיים (שם, כמות, סטטוס)
- ✅ מחיקת ציוד
- ✅ עריכת פרטי העיר
- ✅ שינוי סיסמה

**שימוש:** מתאים למנהל ראשי של העיר שמנהל את הכל

---

## 📊 טבלת משתמשים (users table)

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY,                    -- מקושר ל-auth.users
  email TEXT UNIQUE NOT NULL,             -- email@domain.com
  role user_role NOT NULL,                -- 'city_manager' | 'super_admin'
  city_id UUID,                           -- קישור לעיר (NULL עבור super admin)
  full_name TEXT,                         -- "יוסי כהן"
  permissions user_permission NOT NULL,   -- 'view_only' | 'approve_requests' | 'full_access'
  phone TEXT,                             -- "0501234567"
  is_active BOOLEAN DEFAULT true,         -- האם המשתמש פעיל
  last_login_at TIMESTAMPTZ,              -- כניסה אחרונה
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### דוגמה - עיר עם 2 מנהלים:

```sql
-- מנהל ראשי של ירושלים (גישה מלאה)
INSERT INTO users VALUES (
  'uuid-1',
  'yossi.jerusalem@aron-tziyud.local',
  'city_manager',
  'jerusalem-city-uuid',
  'יוסי כהן',
  'full_access',
  '0501234567',
  true,
  NULL,
  NOW(),
  NOW()
);

-- מנהל משני של ירושלים (רק אישור בקשות)
INSERT INTO users VALUES (
  'uuid-2',
  'david.jerusalem@aron-tziyud.local',
  'city_manager',
  'jerusalem-city-uuid',  -- ← אותו city_id!
  'דוד לוי',
  'approve_requests',
  '0507654321',
  true,
  NULL,
  NOW(),
  NOW()
);
```

שני המשתמשים:
- ✅ נכנסים לאותו ממשק ניהול העיר
- ✅ רואים את אותו הציוד
- ✅ אבל יש להם הרשאות שונות
- ✅ כל פעולה מתועדת עם שם המשתמש המלא

---

## 🔒 Row Level Security (RLS)

### מה זה RLS?
**אבטחה ברמת השורה** - ההרשאות מוגדרות **במסד הנתונים עצמו**.
גם אם מישהו מנסה לעקוף את ה-API, הדאטאבייס חוסם אותו!

### דוגמאות:

#### Equipment Table:
```sql
-- מנהל עיר יכול לראות רק ציוד של העיר שלו
CREATE POLICY "City managers view own equipment"
  ON equipment FOR SELECT
  USING (city_id = public.get_user_city_id());

-- רק מנהל עם full_access יכול להוסיף/לערוך/למחוק
CREATE POLICY "City managers with full access manage equipment"
  ON equipment FOR ALL
  USING (
    city_id = public.get_user_city_id()
    AND public.has_full_access()
  );
```

#### Equipment Requests Table:
```sql
-- כולם יכולים לראות בקשות
CREATE POLICY "City managers view own requests"
  ON equipment_requests FOR SELECT
  USING (city_id = public.get_user_city_id());

-- רק מי שיש לו approve_requests או full_access יכול לאשר
CREATE POLICY "City managers approve requests"
  ON equipment_requests FOR UPDATE
  USING (
    city_id = public.get_user_city_id()
    AND public.can_approve_requests()
  );

-- רק full_access יכול למחוק בקשות
CREATE POLICY "City managers with full access delete requests"
  ON equipment_requests FOR DELETE
  USING (
    city_id = public.get_user_city_id()
    AND public.has_full_access()
  );
```

---

## 🛠️ שימוש ב-Auth Middleware

### בקובץ API Route:

#### דוגמה 1: דורש התחברות בסיסית
```typescript
// src/app/api/city/[cityId]/equipment/route.ts
import { requireAuth } from '@/lib/auth-middleware'

export async function GET(request: NextRequest) {
  // בדיקת אימות
  const { user, error } = await requireAuth(request)
  if (error) return error

  // המשתמש מאומת - המשך...
  console.log(`User ${user.full_name} is accessing equipment`)
}
```

#### דוגמה 2: דורש הרשאות מנהל עיר
```typescript
import { requireCityManager } from '@/lib/auth-middleware'

export async function GET(
  request: NextRequest,
  { params }: { params: { cityId: string } }
) {
  const { user, error } = await requireCityManager(request, params.cityId)
  if (error) return error

  // המשתמש מורשה לגשת לעיר הזו
}
```

#### דוגמה 3: דורש גישה מלאה
```typescript
import { requireFullAccess } from '@/lib/auth-middleware'

export async function POST(
  request: NextRequest,
  { params }: { params: { cityId: string } }
) {
  const { user, error } = await requireFullAccess(request, params.cityId)
  if (error) return error

  // רק משתמשים עם full_access יכולים להוסיף ציוד
  const body = await request.json()
  // ...הוסף ציוד
}
```

#### דוגמה 4: דורש הרשאת אישור בקשות
```typescript
import { requireApprovePermission } from '@/lib/auth-middleware'

export async function PUT(
  request: NextRequest,
  { params }: { params: { cityId: string, requestId: string } }
) {
  const { user, error } = await requireApprovePermission(request, params.cityId)
  if (error) return error

  // רק משתמשים עם approve_requests או full_access יכולים לאשר
  // ...אשר בקשה
}
```

#### דוגמה 5: דורש מנהל ראשי
```typescript
import { requireSuperAdmin } from '@/lib/auth-middleware'

export async function POST(request: NextRequest) {
  const { user, error } = await requireSuperAdmin(request)
  if (error) return error

  // רק super admin יכול להוסיף עיר חדשה
  // ...הוסף עיר
}
```

---

## 🔄 זרימת התחברות

### משתמש חדש (Supabase Auth):

```
1. משתמש מזין:
   📧 Email: yossi.jerusalem@aron-tziyud.local
   🔑 Password: ********

2. Frontend שולח POST ל: /api/auth/login

3. Backend:
   - קורא ל-supabase.auth.signInWithPassword()
   - Supabase מאמת את הסיסמה
   - אם תקין: מחזיר JWT token

4. Frontend:
   - שומר את ה-session ב-cookies
   - מנתב ל: /city/[cityId]/admin

5. בכל request:
   - Cookie מועבר אוטומטית
   - Backend מאמת עם supabase.auth.getUser()
   - שולף פרופיל מ-users table
   - בודק הרשאות
```

### משתמש ישן (Legacy - Dual Mode):

```
1. משתמש מזין:
   🏙️ City ID: jerusalem
   🔑 Password: ********

2. Frontend שולח POST ל: /api/auth/city/login

3. Backend (Dual Mode):
   A. ניסיון ראשון: בדיקה ב-Supabase Auth
      - מחפש user עם email מבוסס על city_id
      - אם לא מצא → עובר ל-B

   B. ניסיון שני: בדיקה בשיטה הישנה
      - שואל את cities table
      - משווה סיסמה (bcrypt)
      - אם תקין: יוצר session ישנה

4. מציע למשתמש: "רוצה לעבור לכניסה חדשה?"
```

---

## 📋 Checklist התקנה

### שלב 1: הרצת Migrations ✅
- [ ] פתחתי את Supabase Dashboard
- [ ] הרצתי את `20251111_auth_setup.sql`
- [ ] הרצתי את `20251111_auth_rls_policies.sql`
- [ ] אין שגיאות

### שלב 2: יצירת Super Admin ✅
- [ ] יצרתי משתמש ב-Authentication → Users
- [ ] עדכנתי את ה-role ל-super_admin
- [ ] בדקתי שאני יכול להיכנס

### שלב 3: יצירת משתמשי ערים ✅
- [ ] יצרתי משתמש לכל מנהל עיר
- [ ] קישרתי לcity_id הנכון
- [ ] הגדרתי הרשאות מתאימות

### שלב 4: עדכון קוד ✅
- [ ] עדכנתי API Routes לשימוש ב-middleware
- [ ] עדכנתי דפי Login
- [ ] בדקתי שהכל עובד

---

## 🎯 דוגמאות שימוש מהחיים האמיתיים

### תרחיש 1: עיר ירושלים עם 2 מנהלים

```typescript
// יוסי - מנהל ראשי (full_access)
{
  email: 'yossi.jerusalem@aron-tziyud.local',
  full_name: 'יוסי כהן',
  permissions: 'full_access',
  city_id: 'jerusalem-uuid'
}

// דוד - מנהל משני (approve_requests)
{
  email: 'david.jerusalem@aron-tziyud.local',
  full_name: 'דוד לוי',
  permissions: 'approve_requests',
  city_id: 'jerusalem-uuid'
}
```

**מה קורה בפועל:**

#### יוסי נכנס:
```
✅ רואה את כל הציוד
✅ יכול להוסיף אוהל חדש
✅ יכול לערוך כמות
✅ יכול למחוק ציוד
✅ יכול לאשר בקשות
✅ יכול לשנות פרטי העיר
```

#### דוד נכנס:
```
✅ רואה את כל הציוד
❌ לא יכול להוסיף ציוד חדש (כפתור נעלם/disabled)
❌ לא יכול לערוך ציוד (כפתור נעלם/disabled)
❌ לא יכול למחוק (כפתור נעלם)
✅ יכול לאשר/לדחות בקשות
❌ לא יכול לשנות פרטי העיר
```

#### Activity Log:
```
[2025-11-11 12:34] יוסי כהן הוסיף ציוד: 10 אוהלים
[2025-11-11 12:45] דוד לוי אישר בקשה #123 למשה כהן
[2025-11-11 13:00] יוסי כהן עדכן כמות: 8 אוהלים
```

---

## 🚀 השלבים הבאים

עכשיו צריך:
1. ✅ להריץ את ה-Migrations בSupabase
2. ✅ ליצור משתמש Super Admin ראשון
3. ⏳ לעדכן את API Routes הקיימים
4. ⏳ לעדכן את דפי ה-Login
5. ⏳ להוסיף UI לניהול משתמשים
6. ⏳ לבנות זרימת מעבר למשתמשים ישנים

**מוכן להמשיך?** 🎯
