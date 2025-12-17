'use client';

import { useRouter } from 'next/navigation';

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-800">מדיניות פרטיות</h1>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            חזרה
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          <section>
            <p className="text-gray-600 mb-4">
              עדכון אחרון: דצמבר 2024
            </p>
            <p className="text-gray-700">
              מערכת &quot;ארון ציוד&quot; (להלן: &quot;המערכת&quot;) היא מערכת פרטית המיועדת לסייע למתנדבים.
              אנו מחויבים להגן על פרטיות המשתמשים שלנו. מדיניות פרטיות זו מסבירה כיצד אנו אוספים,
              משתמשים ומגנים על המידע האישי שלך.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">1. המידע שאנו אוספים</h2>
            <p className="text-gray-700 mb-2">במסגרת השימוש במערכת, אנו עשויים לאסוף את המידע הבא:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mr-4">
              <li>שם מלא</li>
              <li>מספר טלפון</li>
              <li>כתובת דוא&quot;ל</li>
              <li>עיר מגורים</li>
              <li>היסטוריית השאלות והחזרות ציוד</li>
              <li>תמונות של ציוד (במידה והועלו)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">2. מטרות השימוש במידע</h2>
            <p className="text-gray-700 mb-2">המידע שנאסף משמש אותנו למטרות הבאות:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mr-4">
              <li>ניהול השאלות והחזרות של ציוד</li>
              <li>יצירת קשר עם המשתמשים בנוגע לציוד מושאל</li>
              <li>שליחת תזכורות להחזרת ציוד</li>
              <li>שיפור השירות והמערכת</li>
              <li>ניהול חשבון המשתמש</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">3. אחסון המידע ואבטחתו</h2>
            <p className="text-gray-700">
              המידע מאוחסן במערכות מאובטחות של Firebase (Google Cloud).
              אנו נוקטים באמצעי אבטחה מקובלים כדי להגן על המידע מפני גישה בלתי מורשית,
              שינוי, חשיפה או השמדה.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">4. שיתוף מידע עם צדדים שלישיים</h2>
            <p className="text-gray-700">
              איננו מוכרים, סוחרים או מעבירים את המידע האישי שלך לצדדים שלישיים,
              למעט במקרים הבאים:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mr-4 mt-2">
              <li>לספקי שירותים הפועלים מטעמנו (כגון Firebase לאחסון נתונים)</li>
              <li>כאשר נדרש על פי חוק</li>
              <li>להגנה על זכויותינו או בטיחות המשתמשים</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">5. זכויות המשתמש</h2>
            <p className="text-gray-700 mb-2">בהתאם לחוק הגנת הפרטיות, עומדות לך הזכויות הבאות:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mr-4">
              <li>לעיין במידע השמור אודותיך</li>
              <li>לבקש תיקון מידע שגוי</li>
              <li>לבקש מחיקת המידע שלך מהמערכת</li>
              <li>להתנגד לשימוש במידע לצרכי שיווק</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">6. עוגיות (Cookies)</h2>
            <p className="text-gray-700">
              המערכת משתמשת בעוגיות לצורך שמירת העדפות משתמש וניהול התחברות.
              עוגיות אלו חיוניות לתפקוד המערכת ואינן משמשות למטרות פרסום.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">7. שינויים במדיניות הפרטיות</h2>
            <p className="text-gray-700">
              אנו שומרים לעצמנו את הזכות לעדכן מדיניות פרטיות זו מעת לעת.
              שינויים מהותיים יפורסמו במערכת.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">8. יצירת קשר</h2>
            <p className="text-gray-700">
              לשאלות או בקשות בנוגע למדיניות הפרטיות, ניתן לפנות אלינו דרך עמוד המשוב במערכת.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
