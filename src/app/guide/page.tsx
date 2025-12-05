'use client'

import { useState } from 'react'

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState<'pwa' | 'notifications'>('pwa')

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-blue-600 text-white py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-center">מדריך התקנה</h1>
          <p className="text-center text-blue-100 mt-2">ארון ציוד - ידידים</p>
        </div>
      </div>

      {/* Important Notice */}
      <div className="max-w-2xl mx-auto px-4 mt-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-bold text-yellow-800">שימו לב!</h3>
              <p className="text-yellow-700 text-sm mt-1">
                גם מי שהפעיל התראות בעבר - יש להפעיל מחדש!
                המערכת עודכנה ונדרשת הרשמה חדשה להתראות.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-4 mt-6">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSection('pwa')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              activeSection === 'pwa'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            התקנת האפליקציה
          </button>
          <button
            onClick={() => setActiveSection('notifications')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              activeSection === 'notifications'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            הפעלת התראות
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {activeSection === 'pwa' ? (
          <div className="space-y-6">
            {/* Android */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-green-500 text-white px-4 py-3 flex items-center gap-2">
                <span className="text-xl">🤖</span>
                <h2 className="font-bold">אנדרואיד (Chrome)</h2>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold shrink-0">1</div>
                  <div>
                    <p className="font-medium">פתחו את האתר בכרום</p>
                    <p className="text-gray-500 text-sm">aron-tziyud.vercel.app</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold shrink-0">2</div>
                  <div>
                    <p className="font-medium">לחצו על שלוש הנקודות ⋮</p>
                    <p className="text-gray-500 text-sm">בפינה הימנית העליונה</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold shrink-0">3</div>
                  <div>
                    <p className="font-medium">בחרו &quot;הוסף למסך הבית&quot;</p>
                    <p className="text-gray-500 text-sm">או &quot;התקן אפליקציה&quot;</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold shrink-0">4</div>
                  <div>
                    <p className="font-medium">אשרו את ההתקנה</p>
                    <p className="text-gray-500 text-sm">האייקון יופיע במסך הבית</p>
                  </div>
                </div>
              </div>
            </div>

            {/* iPhone */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-800 text-white px-4 py-3 flex items-center gap-2">
                <span className="text-xl">🍎</span>
                <h2 className="font-bold">אייפון (Safari)</h2>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold shrink-0">1</div>
                  <div>
                    <p className="font-medium">פתחו את האתר בספארי</p>
                    <p className="text-gray-500 text-sm">חשוב! רק בספארי זה עובד</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold shrink-0">2</div>
                  <div>
                    <p className="font-medium">לחצו על כפתור השיתוף</p>
                    <p className="text-gray-500 text-sm">הריבוע עם החץ למעלה ⬆️</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold shrink-0">3</div>
                  <div>
                    <p className="font-medium">גללו ובחרו &quot;הוסף למסך הבית&quot;</p>
                    <p className="text-gray-500 text-sm">Add to Home Screen</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold shrink-0">4</div>
                  <div>
                    <p className="font-medium">לחצו &quot;הוסף&quot;</p>
                    <p className="text-gray-500 text-sm">האייקון יופיע במסך הבית</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-blue-500 text-white px-4 py-3 flex items-center gap-2">
                <span className="text-xl">💻</span>
                <h2 className="font-bold">מחשב (Chrome / Edge)</h2>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold shrink-0">1</div>
                  <div>
                    <p className="font-medium">פתחו את האתר בכרום או אדג&apos;</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold shrink-0">2</div>
                  <div>
                    <p className="font-medium">חפשו אייקון התקנה בשורת הכתובת</p>
                    <p className="text-gray-500 text-sm">או: תפריט ⋮ → &quot;התקן את ארון ציוד&quot;</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold shrink-0">3</div>
                  <div>
                    <p className="font-medium">אשרו את ההתקנה</p>
                    <p className="text-gray-500 text-sm">האפליקציה תיפתח בחלון נפרד</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Enable Notifications */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-orange-500 text-white px-4 py-3 flex items-center gap-2">
                <span className="text-xl">🔔</span>
                <h2 className="font-bold">הפעלת התראות</h2>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold shrink-0">1</div>
                  <div>
                    <p className="font-medium">היכנסו לדף הניהול</p>
                    <p className="text-gray-500 text-sm">התחברו עם המייל והסיסמה שלכם</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold shrink-0">2</div>
                  <div>
                    <p className="font-medium">מצאו את כפתור ההתראות 🔔</p>
                    <p className="text-gray-500 text-sm">בחלק העליון של הדף</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold shrink-0">3</div>
                  <div>
                    <p className="font-medium">לחצו על הכפתור</p>
                    <p className="text-gray-500 text-sm">אם הכפתור אפור - התראות כבויות</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold shrink-0">4</div>
                  <div>
                    <p className="font-medium">אשרו את ההרשאה בדפדפן</p>
                    <p className="text-gray-500 text-sm">לחצו &quot;אפשר&quot; בחלון הקופץ</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold shrink-0">✓</div>
                  <div>
                    <p className="font-medium text-green-600">מוכן!</p>
                    <p className="text-gray-500 text-sm">תקבלו התראות על בקשות חדשות</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Troubleshooting */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-red-500 text-white px-4 py-3 flex items-center gap-2">
                <span className="text-xl">🔧</span>
                <h2 className="font-bold">לא מקבלים התראות?</h2>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <span>•</span>
                  <p className="text-gray-600">ודאו שההתראות מופעלות בהגדרות המכשיר</p>
                </div>
                <div className="flex items-start gap-2">
                  <span>•</span>
                  <p className="text-gray-600">באייפון: הגדרות → התראות → Safari/האפליקציה</p>
                </div>
                <div className="flex items-start gap-2">
                  <span>•</span>
                  <p className="text-gray-600">באנדרואיד: הגדרות → אפליקציות → Chrome → התראות</p>
                </div>
                <div className="flex items-start gap-2">
                  <span>•</span>
                  <p className="text-gray-600">במחשב: בדקו שההתראות לא חסומות (אייקון המנעול ליד הכתובת)</p>
                </div>
                <div className="flex items-start gap-2">
                  <span>•</span>
                  <p className="text-gray-600">נסו לכבות ולהפעיל מחדש את ההתראות בדף הניהול</p>
                </div>
              </div>
            </div>

            {/* What notifications will you get */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-purple-500 text-white px-4 py-3 flex items-center gap-2">
                <span className="text-xl">📬</span>
                <h2 className="font-bold">אילו התראות תקבלו?</h2>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                  <span className="text-xl">📦</span>
                  <p className="text-gray-700">בקשת ציוד חדשה מהעיר שלכם</p>
                </div>
                <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                  <span className="text-xl">✅</span>
                  <p className="text-gray-700">עדכונים על סטטוס בקשות</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-2xl mx-auto px-4 pb-8">
        <div className="text-center text-gray-400 text-sm">
          יש שאלות? פנו למנהל המערכת
        </div>
      </div>
    </div>
  )
}
