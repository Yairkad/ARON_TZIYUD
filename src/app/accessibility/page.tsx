'use client';

import { useRouter } from 'next/navigation';

export default function AccessibilityPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-800">הצהרת נגישות</h1>
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
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">מחויבות לנגישות</h2>
            <p className="text-gray-700">
              אנו מחויבים להנגשת מערכת &quot;ארון ציוד&quot; לאנשים עם מוגבלויות,
              בהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע&quot;ג-2013,
              ולתקן הישראלי ת&quot;י 5568 המבוסס על הנחיות WCAG 2.0 ברמת AA.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">התאמות הנגישות באתר</h2>
            <p className="text-gray-700 mb-2">המערכת כוללת את התאמות הנגישות הבאות:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mr-4">
              <li>תמיכה בקוראי מסך</li>
              <li>ניווט באמצעות מקלדת</li>
              <li>טקסט ברור וקריא</li>
              <li>ניגודיות צבעים מתאימה</li>
              <li>מבנה סמנטי תקין</li>
              <li>תיוג תמונות (alt text) במקומות הרלוונטיים</li>
              <li>טפסים עם תוויות ברורות</li>
              <li>תמיכה בהגדלת טקסט</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">רכיבים שעשויים להיות פחות נגישים</h2>
            <p className="text-gray-700 mb-2">
              אנו עובדים כל הזמן על שיפור הנגישות. ייתכן שחלק מהרכיבים הבאים עדיין לא נגישים באופן מלא:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mr-4">
              <li>מפות אינטראקטיביות</li>
              <li>חלק מהתמונות שהועלו על ידי משתמשים</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">דפדפנים וטכנולוגיות מסייעות</h2>
            <p className="text-gray-700">
              המערכת נבדקה ותומכת בדפדפנים המובילים (Chrome, Firefox, Safari, Edge)
              ובטכנולוגיות מסייעות כגון NVDA ו-VoiceOver.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">יצירת קשר בנושא נגישות</h2>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-700">
                לפניות בנושא נגישות, ניתן לפנות דרך{' '}
                <a href="/feedback" className="text-blue-600 hover:underline font-medium">
                  עמוד המשוב
                </a>
                {' '}במערכת.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">דיווח על בעיות נגישות</h2>
            <p className="text-gray-700">
              אם נתקלתם בבעיית נגישות כלשהי, נשמח לשמוע ולטפל בכך בהקדם האפשרי.
              ניתן לדווח דרך עמוד המשוב במערכת או ליצור קשר ישירות עם רכז הנגישות.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">תאריך עדכון הצהרת הנגישות</h2>
            <p className="text-gray-700">
              הצהרת נגישות זו עודכנה לאחרונה בתאריך: דצמבר 2024.
              אנו מתעדכנים ומשפרים את נגישות המערכת באופן שוטף.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
