'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { City } from '@/types'
import Logo from '@/components/Logo'
import { ChevronDown } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const [selectedCity, setSelectedCity] = useState<City | null>(null)

  useEffect(() => {
    fetchCities()
  }, [])

  const fetchCities = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching cities:', error)
    } else {
      setCities(data || [])
    }
    setLoading(false)
  }

  const handleCitySelect = (city: City) => {
    setSelectedCity(city)
    setShowCityDropdown(false)
    router.push(`/city/${city.id}`)
  }

  return (
    <div className="min-h-screen content-wrapper flex flex-col items-center justify-center p-4 pt-16 sm:pt-4 relative">
      {/* Admin Login Button - Responsive positioning */}
      <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10">
        <Button
          onClick={() => router.push('/login')}
          variant="ghost"
          size="sm"
          className="h-8 sm:h-9 px-2 sm:px-3 rounded-full hover:bg-blue-50 text-blue-600 text-xs sm:text-sm font-medium transition-all duration-200 hover:scale-105 border border-blue-200 shadow-sm"
          title="כניסת מנהל"
        >
          <span className="hidden sm:inline">🔐 כניסת מנהל</span>
          <span className="sm:hidden">🔐 מנהל</span>
        </Button>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Logo */}
        <div className="mb-8">
          <Logo />
        </div>

        {/* Welcome Message */}
        <div className="space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800">
            ברוכים הבאים לארון הציוד
          </h2>
          <p className="text-lg sm:text-xl text-gray-600">
            מערכת השאלות וניהול ציוד מתקדמת
          </p>
        </div>

        {/* Start Button with Dropdown */}
        <div className="relative">
          <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-2xl">
            <CardContent className="p-8">
              {!showCityDropdown ? (
                <div className="space-y-4">
                  <div className="text-6xl mb-4">🏙️</div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    בחר עיר להתחלה
                  </h3>
                  <p className="text-gray-600 mb-6">
                    לחץ על הכפתור למטה כדי לבחור את העיר שלך
                  </p>
                  <Button
                    onClick={() => setShowCityDropdown(true)}
                    disabled={loading}
                    className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  >
                    {loading ? (
                      '⏳ טוען ערים...'
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        🚀 התחל
                        <ChevronDown className="h-5 w-5" />
                      </span>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800">
                      בחר עיר
                    </h3>
                    <Button
                      onClick={() => setShowCityDropdown(false)}
                      variant="ghost"
                      size="sm"
                      className="text-gray-600 hover:text-gray-800"
                    >
                      ❌ סגור
                    </Button>
                  </div>

                  {cities.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">אין ערים זמינות כרגע</p>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {cities.map((city) => (
                        <div
                          key={city.id}
                          className="w-full text-right p-4 rounded-xl bg-white border-2 border-gray-200 hover:border-blue-400 transition-all duration-200 hover:shadow-md group flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl group-hover:scale-110 transition-transform">
                              🏙️
                            </span>
                            <div className="text-right">
                              <h4 className="font-bold text-lg text-gray-800">
                                {city.name}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {city.manager1_name}
                                {city.manager2_name && ` • ${city.manager2_name}`}
                              </p>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleCitySelect(city)}
                            size="sm"
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
                          >
                            בחירה
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
            <CardContent className="p-6 text-center">
              <div className="text-6xl mb-4">⚡</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">פשוט ומהיר</h3>
              <p className="text-gray-600">
                תהליך השאלה מהיר וקל - בחר ציוד, מלא פרטים, וקבל אישור
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-teal-50 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
            <CardContent className="p-6 text-center">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">זמין תמיד</h3>
              <p className="text-gray-600">
                גישה למערכת 24/7 לביצוע בקשות והצגת היסטוריית השאלות
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
            <CardContent className="p-6 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">ציוד מגוון</h3>
              <p className="text-gray-600">
                מגוון רחב של ציוד זמין להשאלה - כל מה שאתה צריך במקום אחד
              </p>
            </CardContent>
          </Card>
        </div>

        {/* User Guide */}
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg mt-12">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-purple-800">📖 מדריך למשתמש</CardTitle>
            <CardDescription className="text-center text-purple-600">איך להשתמש במערכת ארון הציוד</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">1️⃣</div>
                  <div>
                    <h5 className="font-bold text-gray-800 mb-1">בחר את העיר שלך</h5>
                    <p className="text-sm text-gray-600">לחץ על "התחל" ובחר את העיר שלך מהרשימה</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-3xl">2️⃣</div>
                  <div>
                    <h5 className="font-bold text-gray-800 mb-1">בחר ציוד</h5>
                    <p className="text-sm text-gray-600">עיין ברשימת הציוד הזמין ובחר מה שאתה צריך</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-3xl">3️⃣</div>
                  <div>
                    <h5 className="font-bold text-gray-800 mb-1">הזן פרטים</h5>
                    <p className="text-sm text-gray-600">מלא את הפרטים האישיים שלך ושלח בקשה</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">4️⃣</div>
                  <div>
                    <h5 className="font-bold text-gray-800 mb-1">קבל אישור</h5>
                    <p className="text-sm text-gray-600">המנהל יאשר את הבקשה ותקבל הודעה</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-3xl">5️⃣</div>
                  <div>
                    <h5 className="font-bold text-gray-800 mb-1">קבל את הציוד</h5>
                    <p className="text-sm text-gray-600">בוא לארון בזמן שסוכם וקבל את הציוד</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-3xl">6️⃣</div>
                  <div>
                    <h5 className="font-bold text-gray-800 mb-1">החזר בזמן</h5>
                    <p className="text-sm text-gray-600">יש להחזיר את הציוד המושאל מיד עם סיום הטיפול בקריאה ולא יאוחר מ-48 שעות. אין צורך להחזיר ציוד מתכלה (ציוד שכתוב לידו "אין צורך להחזיר" 😉)</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-center mt-6">
              <Link href="/user-guide">
                <Button className="gap-2 bg-purple-600 hover:bg-purple-700 text-white">
                  📖 מדריך מלא ומפורט
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
