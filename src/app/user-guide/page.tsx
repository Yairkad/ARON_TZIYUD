'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Home } from "lucide-react"
import Link from "next/link"

export default function UserGuidePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-800 mb-2">📖 מדריך למשתמש</h1>
          <p className="text-lg text-purple-600">איך להשתמש במערכת ארון הציוד</p>
        </div>

        {/* Back to Home Button */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <Home className="h-4 w-4" />
              חזרה לדף הבית
            </Button>
          </Link>
        </div>

        {/* Quick Start Guide */}
        <Card className="mb-8 border-2 border-purple-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100">
            <CardTitle className="text-2xl text-purple-800">🚀 התחלה מהירה</CardTitle>
            <CardDescription className="text-purple-600">6 צעדים פשוטים לקבלת ציוד</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
                  <div className="text-3xl">1️⃣</div>
                  <div>
                    <h5 className="font-bold text-gray-800 mb-1">בחר את העיר שלך</h5>
                    <p className="text-sm text-gray-600">לחץ על "התחל" ובחר את העיר שלך מהרשימה</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
                  <div className="text-3xl">2️⃣</div>
                  <div>
                    <h5 className="font-bold text-gray-800 mb-1">בחר ציוד</h5>
                    <p className="text-sm text-gray-600">עיין ברשימת הציוד הזמין ובחר מה שאתה צריך. שים לב לכמות הזמינה</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
                  <div className="text-3xl">3️⃣</div>
                  <div>
                    <h5 className="font-bold text-gray-800 mb-1">הזן פרטים</h5>
                    <p className="text-sm text-gray-600">מלא את השם ומספר הטלפון שלך ושלח את הבקשה</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
                  <div className="text-3xl">4️⃣</div>
                  <div>
                    <h5 className="font-bold text-gray-800 mb-1">המתן לאישור</h5>
                    <p className="text-sm text-gray-600">מנהל העיר יאשר את הבקשה שלך. אם העיר במצב "אישור דרוש", תקבל קישור לאחר אישור</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
                  <div className="text-3xl">5️⃣</div>
                  <div>
                    <h5 className="font-bold text-gray-800 mb-1">קבל את הציוד</h5>
                    <p className="text-sm text-gray-600">הגע לארון הציוד והשתמש בקישור שקיבלת לאישור הלקיחה, או פשוט קח את הציוד (במצב גישה חופשית)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
                  <div className="text-3xl">6️⃣</div>
                  <div>
                    <h5 className="font-bold text-gray-800 mb-1">החזר בזמן</h5>
                    <p className="text-sm text-gray-600">יש להחזיר את הציוד המושאל מיד עם סיום הטיפול בקריאה ולא יאוחר מ-48 שעות</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Sections */}
        <div className="space-y-6">
          {/* Requesting Equipment */}
          <Card className="border-2 border-blue-200">
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-xl text-blue-800">🛒 ביצוע בקשה לציוד</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <h4 className="font-bold text-gray-800 mb-2">שני מצבי עבודה:</h4>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mr-4">
                  <li>
                    <strong>גישה חופשית:</strong> באפשרותך לקחת ציוד ישירות מהארון. מומלץ עדיין לבצע דיווח במערכת כדי לעדכן את המלאי
                  </li>
                  <li>
                    <strong>אישור דרוש:</strong> עליך לשלוח בקשה ולהמתין לאישור מנהל העיר. לאחר האישור תקבל קישור לאיסוף הציוד
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 mb-2">טיפים חשובים:</h4>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mr-4">
                  <li>בדוק את הכמות הזמינה לפני שאתה שולח בקשה</li>
                  <li>ודא שמספר הטלפון שלך נכון - דרכו יתקשרו אליך במידת הצורך</li>
                  <li>אפשר לבקש מספר פריטי ציוד בבקשה אחת</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Using the Token */}
          <Card className="border-2 border-green-200">
            <CardHeader className="bg-green-50">
              <CardTitle className="text-xl text-green-800">🔐 שימוש בקישור לאיסוף ציוד</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <h4 className="font-bold text-gray-800 mb-2">מה זה הקישור?</h4>
                <p className="text-gray-700 mb-2">
                  במצב "אישור דרוש", לאחר שמנהל העיר מאשר את הבקשה שלך, תקבל קישור ייחודי (טוקן) שמאפשר לך לאסוף את הציוד.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 mb-2">איך משתמשים בו?</h4>
                <ol className="list-decimal list-inside space-y-2 text-gray-700 mr-4">
                  <li>לחץ על הקישור שקיבלת (בווטסאפ או במייל)</li>
                  <li>המערכת תציג לך את פרטי הבקשה - שם, טלפון, רשימת הציוד</li>
                  <li>לחץ על "אשר לקיחת ציוד"</li>
                  <li>המערכת תעדכן את המלאי באופן אוטומטי</li>
                  <li>תועבר אוטומטית לעמוד החזרת ציוד</li>
                </ol>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>⚠️ חשוב:</strong> הקישור תקף לזמן מוגבל (חצי שעה). לאחר תום התוקף יהיה צורך לבקש קישור חדש מהמנהל.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Returning Equipment */}
          <Card className="border-2 border-orange-200">
            <CardHeader className="bg-orange-50">
              <CardTitle className="text-xl text-orange-800">↩️ החזרת ציוד</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <h4 className="font-bold text-gray-800 mb-2">מתי להחזיר?</h4>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mr-4">
                  <li>יש להחזיר את הציוד <strong>מיד עם סיום הטיפול בקריאה</strong></li>
                  <li>לא יאוחר מ-<strong>48 שעות</strong> מרגע הלקיחה</li>
                  <li>ציוד מתכלה (מסומן "אין צורך להחזיר") לא צריך להחזיר</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 mb-2">איך מחזירים?</h4>
                <ol className="list-decimal list-inside space-y-2 text-gray-700 mr-4">
                  <li>היכנס לדף העיר או השתמש בקישור הישיר לעמוד "החזרת ציוד"</li>
                  <li>הזן את מס' הטלפון איתו ביצעת השאלה, המערכת תזהה לבד אילו פריטים נמצאים אצלך<li>
                  <li>בחר את הציוד שאתה מחזיר מהרשימה</li>
                  <li>ציין את מצב הציוד (תקין/תקלה)</li>
                  <li>לחץ על "החזר ציוד"</li>
                  <li>חובה! לצלם את המיוד מונח במקומו בארון בטרם תאושר ההחזרה.<li>
                </ol>
              </div>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>⚠️ חשוב מאוד:</strong> החזרת ציוד בזמן היא קריטית! איחור בהחזרה עלול למנוע משימוש בציוד על ידי חברי צוות אחרים.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 mb-2">דיווח על תקלה</h4>
                <p className="text-gray-700">
                  אם הציוד לא תקין, ציין זאת בעת ההחזרה. המנהל יטפל בתקלה ויעדכן את המלאי בהתאם.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Equipment Types */}
          <Card className="border-2 border-purple-200">
            <CardHeader className="bg-purple-50">
              <CardTitle className="text-xl text-purple-800">📦 סוגי ציוד</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <h4 className="font-bold text-gray-800 mb-2">ציוד רגיל (ציוד שאילה)</h4>
                <p className="text-gray-700 mb-2">
                  ציוד שצריך להחזיר לאחר השימוש. לדוגמה: ג'ק, קומפרסור, ערכת פתיחה, בוקסות וכו'.
                </p>
                <p className="text-sm text-gray-600">
                  ⏰ יש להחזיר תוך 48 שעות מרגע הלקיחה
                </p>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 mb-2">ציוד מתכלה</h4>
                <p className="text-gray-700 mb-2">
                  ציוד שמיועד לשימוש חד-פעמי או שנצרך במהלך השימוש. מסומן ב-"😉 אין צורך להחזיר".
                </p>
                <p className="text-sm text-gray-600">
                  💡 דוגמאות: ונטילים, ברגי סיליקון, גומיות יוניט ברקס, וכו'
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Contact & Support */}
          <Card className="border-2 border-indigo-200">
            <CardHeader className="bg-indigo-50">
              <CardTitle className="text-xl text-indigo-800">📞 צור קשר ותמיכה</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <h4 className="font-bold text-gray-800 mb-2">שאלות ובעיות טכניות</h4>
                <p className="text-gray-700 mb-2">
                  אם נתקלת בבעיה במערכת או שיש לך שאלות, פנה למנהל העיר שלך.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 mb-2">בעיות עם ציוד</h4>
                <p className="text-gray-700 mb-2">
                  אם נתקלת בציוד לא תקין או שחסר ציוד, דווח על כך למנהל העיר בהקדם האפשרי.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tips & Best Practices */}
          <Card className="border-2 border-teal-200">
            <CardHeader className="bg-teal-50">
              <CardTitle className="text-xl text-teal-800">💡 טיפים ושיטות עבודה מומלצות</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 font-bold">✓</span>
                  <span>בדוק את זמינות הציוד לפני שאתה מגיע לארון</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 font-bold">✓</span>
                  <span>ודא שהטלפון שלך נגיש במקרה שהמנהל צריך ליצור איתך קשר</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 font-bold">✓</span>
                  <span>החזר ציוד בהקדם האפשרי - אל תחכה ל-48 שעות</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 font-bold">✓</span>
                  <span>בדוק את מצב הציוד לפני הלקיחה ודווח על כל בעיה</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 font-bold">✓</span>
                  <span>שמור את הקישור (טוקן) שקיבלת במקום נגיש</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 font-bold">✓</span>
                  <span>אם אתה יודע שתזדקק לציוד באופן קבוע, הזמן אותו מאתר ידידים לשימושך...</span>
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
