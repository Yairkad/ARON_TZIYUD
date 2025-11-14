'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function ManagerGuidePage() {
  const router = useRouter()
  const [cityId, setCityId] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function loadUserCityId() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: userProfile } = await supabase
          .from('users')
          .select('city_id')
          .eq('id', user.id)
          .single()

        if (userProfile?.city_id) {
          setCityId(userProfile.city_id)
        }
      } catch (error) {
        console.error('Error loading user city:', error)
      }
    }
    loadUserCityId()
  }, [supabase])

  const handleBackClick = () => {
    if (cityId) {
      router.push(`/city/${cityId}/admin`)
    } else {
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Shield className="h-10 w-10 text-purple-600" />
            <h1 className="text-4xl font-bold text-purple-800">📚 מדריך למנהל עיר</h1>
          </div>
          <p className="text-lg text-purple-600">ניהול מערכת ארון הציוד - מדריך מקיף</p>
        </div>

        {/* Back Button */}
        <div className="mb-6">
          <Button onClick={handleBackClick} variant="outline" className="gap-2">
            <ArrowRight className="h-4 w-4" />
            {cityId ? 'חזרה לעמוד הניהול' : 'חזרה לדף הבית'}
          </Button>
        </div>

        {/* Quick Overview */}
        <Card className="mb-8 border-2 border-purple-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100">
            <CardTitle className="text-2xl text-purple-800">🎯 סקירה כללית</CardTitle>
            <CardDescription className="text-purple-600">מה אתה אחראי עליו כמנהל עיר</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold text-xl">✓</span>
                <span><strong>ניהול מלאי:</strong> הוספה, עריכה ומחיקה של פריטי ציוד</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold text-xl">✓</span>
                <span><strong>אישור בקשות:</strong> אישור או דחייה של בקשות משתמשים (במצב "אישור דרוש")</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold text-xl">✓</span>
                <span><strong>מעקב היסטוריה:</strong> צפייה בהיסטוריית שאילות וסטטוס ציוד</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold text-xl">✓</span>
                <span><strong>הגדרות מערכת:</strong> שינוי מצב עבודה, סיסמאות, הודעות פוש</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold text-xl">✓</span>
                <span><strong>ייצוא נתונים:</strong> ייצוא דוחות Excel להיסטוריה ומלאי</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Login */}
          <Card className="border-2 border-blue-200">
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-xl text-blue-800">🔐 כניסה למערכת</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <h4 className="font-bold text-gray-800 mb-2">שתי דרכי התחברות:</h4>
                <ol className="list-decimal list-inside space-y-3 text-gray-700 mr-4">
                  <li>
                    <strong>התחברות כמנהל עיר (Supabase Auth):</strong>
                    <p className="mr-6 mt-1 text-sm">השתמש במייל וסיסמה שקיבלת. אם שכחת את הסיסמה, פנה למנהל ראשי לאיפוס.</p>
                  </li>
                </ol>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
               
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Work Modes */}
          <Card className="border-2 border-green-200">
            <CardHeader className="bg-green-50">
              <CardTitle className="text-xl text-green-800">⚙️ מצבי עבודה</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <h4 className="font-bold text-gray-800 mb-2">1. מצב גישה חופשית (Open Access)</h4>
                <p className="text-gray-700 mb-2">
                  משתמשים יכולים לקחת ציוד ישירות מהארון ללא אישור מוקדם. המערכת מתעדכנת רק כשמשתמשים מדווחים על לקיחה או החזרה.
                </p>
                <div className="mr-4 mt-2">
                  <p className="text-sm text-gray-600"><strong>מתאים ל:</strong> סביבות עם אמון גבוה, ציוד בסיסי, מוקד קטן</p>
                  <p className="text-sm text-gray-600"><strong>יתרונות:</strong> גמישות מקסימלית, אין המתנה לאישור</p>
                  <p className="text-sm text-gray-600"><strong>חסרונות:</strong> פחות שליטה, תלוי בדיווח עצמי</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-2">2. מצב אישור דרוש (Request Mode)</h4>
                <p className="text-gray-700 mb-2">
                  משתמשים שולחים בקשות והמנהל צריך לאשר אותן. לאחר אישור, המשתמש מקבל קישור (טוקן) לאיסוף הציוד.
                </p>
                <div className="mr-4 mt-2">
                  <p className="text-sm text-gray-600"><strong>מתאים ל:</strong> ציוד יקר/רגיש, שליטה הדוקה על מלאי, מוקדים גדולים</p>
                  <p className="text-sm text-gray-600"><strong>יתרונות:</strong> שליטה מלאה, מעקב מדויק, מניעת גניבות</p>
                  <p className="text-sm text-gray-600"><strong>חסרונות:</strong> דורש טיפול אקטיבי של המנהל</p>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>⚙️ שינוי מצב עבודה:</strong> לחץ על "הגדרות" בממשק הניהול ושנה את "מצב העבודה". השינוי ייכנס לתוקף מיד.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Managing Equipment */}
          <Card className="border-2 border-purple-200">
            <CardHeader className="bg-purple-50">
              <CardTitle className="text-xl text-purple-800">📦 ניהול מלאי ציוד</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <h4 className="font-bold text-gray-800 mb-2">הוספת ציוד חדש</h4>
                <ol className="list-decimal list-inside space-y-2 text-gray-700 mr-4">
                  <li>לחץ על הטאב "ניהול ציוד" בממשק הניהול</li>
                  <li>מלא את הפרטים: שם הציוד, תיאור, כמות זמינה</li>
                  <li>בחר אם הציוד הוא מתכלה (לא צריך להחזיר) או רגיל (צריך להחזיר)</li>
                  <li>לחץ על "הוסף ציוד"</li>
                </ol>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-2">עריכת ציוד קיים</h4>
                <ol className="list-decimal list-inside space-y-2 text-gray-700 mr-4">
                  <li>מצא את הציוד ברשימה</li>
                  <li>לחץ על כפתור "ערוך" (עיפרון)</li>
                  <li>ערוך את הפרטים הנדרשים</li>
                  <li>לחץ על "שמור שינויים"</li>
                </ol>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-2">עדכון כמות ידני</h4>
                <p className="text-gray-700 mb-2">
                  אם הכמות הפיזית בארון לא תואמת למערכת (למשלה, אחרי ספירת מלאי), ניתן לעדכן את הכמות ידנית.
                </p>
                <ol className="list-decimal list-inside space-y-2 text-gray-700 mr-4">
                  <li>לחץ על "ערוך" ליד הציוד</li>
                  <li>שנה את שדה "כמות זמינה"</li>
                  <li>שמור את השינויים</li>
                </ol>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-2">מחיקת ציוד</h4>
                <p className="text-gray-700 mb-2">
                  לחץ על כפתור "מחק" (פח אשפה) ליד הציוד. המערכת תבקש אישור לפני המחיקה.
                </p>
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg mt-2">
                  <p className="text-sm text-red-800">
                    <strong>⚠️ שים לב:</strong> מחיקת ציוד היא פעולה בלתי הפיכה. אם יש היסטוריית שאילות לציוד, היא תישאר במערכת.
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-2">ציוד מתכלה vs. ציוד רגיל</h4>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mr-4">
                  <li>
                    <strong>ציוד מתכלה:</strong> מסומן ב-"אין צורך להחזיר". משתמשים לא צריכים להחזיר אותו. כשנלקח, המלאי מתעדכן ונוצרת רשומת החזרה אוטומטית.
                  </li>
                  <li>
                    <strong>ציוד רגיל:</strong> ציוד שצריך להחזיר תוך 48 שעות. המלאי מתעדכן כשנלקח ושוב כשמוחזר.
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Managing Requests */}
          <Card className="border-2 border-orange-200">
            <CardHeader className="bg-orange-50">
              <CardTitle className="text-xl text-orange-800">📋 ניהול בקשות (במצב "אישור דרוש")</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <h4 className="font-bold text-gray-800 mb-2">אישור בקשה</h4>
                <ol className="list-decimal list-inside space-y-2 text-gray-700 mr-4">
                  <li>לחץ על הטאב "בקשות" - תראה רשימת בקשות ממתינות</li>
                  <li>סקור את פרטי הבקשה: שם, טלפון, רשימת הציוד המבוקש</li>
                  <li>ודא שיש מספיק מלאי לכל הפריטים</li>
                  <li>לחץ על "אשר" - המערכת תציג קישור (טוקן) שצריך לשלוח למשתמש</li>
                  <li>שלח את הקישור למשתמש דרך WhatsApp או העתק אותו</li>
                </ol>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-2">דחיית בקשה</h4>
                <p className="text-gray-700 mb-2">
                  אם אין מלאי או הבקשה לא מתאימה, לחץ על "דחה". הבקשה תסומן כנדחתה ותעבור להיסטוריה.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-2">שליחת קישור בווטסאפ</h4>
                <p className="text-gray-700 mb-2">
                  לאחר אישור בקשה, המערכת מציגה חלון עם הקישור:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mr-4">
                  <li><strong>לחצן WhatsApp:</strong> פותח WhatsApp Web עם הודעה מוכנה לשליחה</li>
                  <li><strong>העתק קישור:</strong> מעתיק את הקישור ללוח, אפשר לשלוח בכל דרך</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-2">יצירת קישור חדש (Regenerate Token)</h4>
                <p className="text-gray-700 mb-2">
                  אם הקישור פג תוקפו או אבד, ניתן ליצור קישור חדש:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-gray-700 mr-4">
                  <li>לחץ על הטאב "בקשות" ומצא את הבקשה המאושרת</li>
                  <li>לחץ על "צור קישור חדש"</li>
                  <li>שלח את הקישור החדש למשתמש</li>
                </ol>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-2">ביטול בקשה</h4>
                <p className="text-gray-700 mb-2">
                  אם המשתמש מבטל או הבקשה כבר לא רלוונטית, לחץ על "בטל". הבקשה תסומן כמבוטלת.
                </p>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>💡 טיפ:</strong> תוקף קישור ברירת מחדל הוא חצי שעה. אחרי זה המשתמש לא יוכל להשתמש בו ותצטרך ליצור קישור חדש.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* History & Tracking */}
          <Card className="border-2 border-indigo-200">
            <CardHeader className="bg-indigo-50">
              <CardTitle className="text-xl text-indigo-800">📊 היסטוריה ומעקב</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <h4 className="font-bold text-gray-800 mb-2">טאב "היסטוריה"</h4>
                <p className="text-gray-700 mb-2">
                  מציג את כל השאילות, מקובצות לפי ציוד. כל קבוצה מראה:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mr-4">
                  <li>שם הציוד וכמה פעמים הושאל</li>
                  <li>רשימת שאילות עם שם, טלפון, תאריכים, סטטוס</li>
                  <li>צבעים שונים: ירוק = הוחזר, כתום = מושאל, אדום = תקלה</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-2">סינון וחיפוש</h4>
                <p className="text-gray-700 mb-2">
                  ניתן לסנן לפי סטטוס (מושאל/הוחזר/תקלה) ולחפש לפי שם ציוד, שם משתמש או טלפון.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-2">ייצוא לאקסל</h4>
                <p className="text-gray-700 mb-2">
                  לחץ על "ייצוא לאקסל" בטאב היסטוריה כדי להוריד קובץ Excel עם כל הנתונים. שימושי לדיווחים ותיעוד.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-2">טיפול בציוד שלא הוחזר</h4>
                <p className="text-gray-700 mb-2">
                  אם מישהו לא מחזיר ציוד תוך 48 שעות:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-gray-700 mr-4">
                  <li>מצא את השאילה בהיסטוריה (תהיה מסומנת בכתום - "מושאל")</li>
                  <li>צור קשר עם המשתמש לפי הטלפון ששמור</li>
                  <li>אם הציוד הוחזר אבל לא דווח, ניתן לעדכן ידנית את הסטטוס</li>
                </ol>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-2">דיווח תקלות</h4>
                <p className="text-gray-700 mb-2">
                  כשמשתמש מחזיר ציוד עם תקלה, רשומת ההחזרה מסומנת באדום עם "תקלה". עליך:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-gray-700 mr-4">
                  <li>לבדוק את הציוד הפיזית</li>
                  <li>לתקן או להחליף</li>
                  <li>לעדכן את המלאי אם צריך (הפחת כמות אם הציוד לא ניתן לתיקון)</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card className="border-2 border-teal-200">
            <CardHeader className="bg-teal-50">
              <CardTitle className="text-xl text-teal-800">⚙️ הגדרות מערכת</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <h4 className="font-bold text-gray-800 mb-2">שינוי מצב עבודה</h4>
                <p className="text-gray-700 mb-2">
                  בטאב "הגדרות" תוכל להחליף בין "גישה חופשית" ל-"אישור דרוש". השינוי משפיע מיידית על כל המשתמשים.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-2">שינוי סיסמאות</h4>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mr-4">
                  <li><strong>סיסמת מנהל:</strong> סיסמה אישית שלך (Supabase Auth) - שנה דרך "הגדרות החשבון"</li>
                  <li><strong>סיסמת העיר:</strong> סיסמה משותפת לכניסה ישירה דרך דף העיר - שנה בטאב "הגדרות"</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-2">קוד ארון (Cabinet Code)</h4>
                <p className="text-gray-700 mb-2">
                  קוד שמוצג למשתמשים לפתיחת הארון (אם הארון דיגיטלי). ערוך בטאב "הגדרות".
                </p>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-2">דרישת קוד זימון (Call ID)</h4>
                <p className="text-gray-700 mb-2">
                  אם מופעל, משתמשים חייבים להזין קוד זימון בעת בקשת ציוד. שימושי למוקדים עם מערכת זימונים.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-2">הודעות פוש (Push Notifications)</h4>
                <p className="text-gray-700 mb-2">
                  במצב "אישור דרוש", ניתן להפעיל הודעות פוש שמתריעות על בקשות חדשות בזמן אמת:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-gray-700 mr-4">
                  <li>לחץ על "הירשם להתראות פוש" בדף הניהול</li>
                  <li>אשר את ההתראות בדפדפן</li>
                  <li>תקבל התראה בכל פעם שמגיעה בקשה חדשה</li>
                </ol>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mt-2">
                  <p className="text-sm text-blue-800">
                    <strong>💡 טיפ:</strong> הודעות פוש עובדות רק כאשר המערכת פתוחה בדפדפן או כאפליקציה PWA מותקנת.
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-2">מיקום הארון</h4>
                <p className="text-gray-700 mb-2">
                  ערוך את כתובת הארון וקישור למיקום בגוגל מפות. המשתמשים יראו את המידע הזה בדף העיר.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Best Practices */}
          <Card className="border-2 border-pink-200">
            <CardHeader className="bg-pink-50">
              <CardTitle className="text-xl text-pink-800">💡 טיפים ושיטות עבודה מומלצות</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-pink-600 font-bold">✓</span>
                  <span><strong>ספירת מלאי שוטפת:</strong> עשה ספירה פיזית של הארון כל שבוע-שבועיים ועדכן את המערכת</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-600 font-bold">✓</span>
                  <span><strong>תגובה מהירה לבקשות:</strong> במצב "אישור דרוש", נסה לאשר בקשות תוך שעה-שעתיים</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-600 font-bold">✓</span>
                  <span><strong>מעקב אחרי שאילות מושהות:</strong> בדוק את ההיסטוריה כל יום וצור קשר עם משתמשים שלא החזירו ציוד</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-600 font-bold">✓</span>
                  <span><strong>תיאורים ברורים:</strong> כשמוסיפים ציוד, כתוב תיאור מפורט - זה עוזר למשתמשים לבחור נכון</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-600 font-bold">✓</span>
                  <span><strong>גיבוי נתונים:</strong> ייצא את ההיסטוריה לאקסל אחת לחודש לגיבוי</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-600 font-bold">✓</span>
                  <span><strong>סיסמאות חזקות:</strong> השתמש בסיסמאות חזקות וייחודיות לחשבון</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-600 font-bold">✓</span>
                  <span><strong>תקשורת עם המשתמשים:</strong> אם יש בעיה או שינוי במערכת, עדכן את חברי הצוות</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-600 font-bold">✓</span>
                  <span><strong>טיפול בתקלות מיידי:</strong> כשמדווחים על ציוד לא תקין, טפל בו בהקדם ועדכן את המלאי</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Common Issues */}
          <Card className="border-2 border-red-200">
            <CardHeader className="bg-red-50">
              <CardTitle className="text-xl text-red-800">🔧 פתרון בעיות נפוצות</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <h4 className="font-bold text-gray-800 mb-2">המלאי במערכת לא תואם לארון</h4>
                <p className="text-gray-700 mb-2">
                  <strong>פתרון:</strong> ערוך את הציוד ועדכן את הכמות ידנית. בדוק האם יש שאילות שלא דווח עליהן החזרה.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-2">משתמש לא מקבל את הקישור</h4>
                <p className="text-gray-700 mb-2">
                  <strong>פתרון:</strong> ודא שמספר הטלפון נכון. נסה להעתיק את הקישור ולשלוח במייל או SMS. בדוק שהקישור לא פג תוקפו.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-2">קישור לא עובד (404 או "בקשה לא נמצאה")</h4>
                <p className="text-gray-700 mb-2">
                  <strong>פתרון:</strong> הקישור כנראה פג תוקפו או כבר נוצל. צור קישור חדש דרך "צור קישור חדש" בטאב בקשות.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-2">לא מקבל הודעות פוש</h4>
                <p className="text-gray-700 mb-2">
                  <strong>פתרון:</strong> ודא שנתת הרשאה להתראות בדפדפן. נסה להירשם שוב להתראות. אם זה לא עובד, בדוק שהמערכת במצב "אישור דרוש" ושהפיצ'ר מופעל.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-2">שכחתי את הסיסמה</h4>
                <p className="text-gray-700 mb-2">
                  <strong>פתרון:</strong> אם זו סיסמת המנהל, לחץ על "שכחתי סיסמה" בעמוד ההתחברות. אם זו סיסמת העיר, צור קשר עם סופר-אדמין או מנהל אחר שיכול לשנות אותה.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="border-2 border-gray-300">
            <CardHeader className="bg-gray-100">
              <CardTitle className="text-xl text-gray-800">🔒 אבטחה ופרטיות</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-gray-600 font-bold">🔐</span>
                  <span>אל תשתף את סיסמת החשבון שלך עם אחרים</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-600 font-bold">🔐</span>
                  <span>שנה את סיסמת העיר באופן תקופתי (כל 3-6 חודשים)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-600 font-bold">🔐</span>
                  <span>התנתק מהמערכת כשאתה עוזב מחשב ציבורי</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-600 font-bold">🔐</span>
                  <span>פרטי המשתמשים (שמות, טלפונים) הם סודיים - אל תשתף אותם מחוץ לצורך</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-600 font-bold">🔐</span>
                  <span>הקישורים (טוקנים) שאתה שולח למשתמשים הם אישיים - אל תפרסם אותם</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Navigation */}
        <div className="mt-8 flex justify-center">
          <Link href="/">
            <Button className="gap-2 bg-purple-600 hover:bg-purple-700">
              <Home className="h-4 w-4" />
              חזרה לדף הבית
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
