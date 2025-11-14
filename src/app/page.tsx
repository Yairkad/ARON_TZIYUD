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
  const [adminUrl, setAdminUrl] = useState<string | null>(null)

  useEffect(() => {
    fetchCities()
    checkAdminStatus()
  }, [])

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setAdminUrl(null)
        return
      }

      const { data: userProfile } = await supabase
        .from('users')
        .select('role, city_id')
        .eq('id', user.id)
        .single()

      if (userProfile) {
        if (userProfile.role === 'super_admin') {
          setAdminUrl('/super-admin')
        } else if (userProfile.role === 'city_manager' && userProfile.city_id) {
          setAdminUrl(`/city/${userProfile.city_id}/admin`)
        }
      }
    } catch (error) {
      console.error('Error checking admin status:', error)
      setAdminUrl(null)
    }
  }

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
          onClick={() => router.push(adminUrl || '/login')}
          variant="ghost"
          size="sm"
          className="h-8 sm:h-9 px-2 sm:px-3 rounded-full hover:bg-blue-50 text-blue-600 text-xs sm:text-sm font-medium transition-all duration-200 hover:scale-105 border border-blue-200 shadow-sm"
          title={adminUrl ? "עבור לעמוד הניהול" : "כניסת מנהל"}
        >
          <span className="hidden sm:inline">{adminUrl ? '⚙️ עמוד ניהול' : '🔐 כניסת מנהל'}</span>
          <span className="sm:hidden">{adminUrl ? '⚙️' : '🔐'}</span>
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
                          className="w-full p-3 rounded-xl bg-white border-2 border-gray-200 hover:border-blue-400 transition-all duration-200 hover:shadow-md group"
                        >
                          <div className="text-center space-y-1.5">
                            <h4 className="font-bold text-lg text-gray-800">
                              {city.name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {city.manager1_name}
                              {city.manager2_name && ` • ${city.manager2_name}`}
                            </p>
                            <Button
                              onClick={() => handleCitySelect(city)}
                              className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-1.5 rounded-lg transition-all duration-200 hover:scale-105"
                            >
                              בחירה
                            </Button>
                          </div>
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
        <div className="grid grid-cols-3 gap-3 mt-8">
          <Card className="border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
            <CardContent className="p-2 text-center">
              <div className="text-2xl mb-1">⚡</div>
              <h3 className="text-xs font-bold text-gray-800 mb-0.5">פשוט ומהיר</h3>
              <p className="text-[10px] text-gray-600 leading-tight">
                תהליך השאלה מהיר וקל - בחר ציוד, מלא פרטים, וקבל אישור
              </p>
            </CardContent>
          </Card>

          <Card className="border border-green-200 bg-gradient-to-br from-green-50 to-teal-50 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
            <CardContent className="p-2 text-center">
              <div className="text-2xl mb-1">🎯</div>
              <h3 className="text-xs font-bold text-gray-800 mb-0.5">זמין תמיד</h3>
              <p className="text-[10px] text-gray-600 leading-tight">
                גישה למערכת 24/7 לביצוע בקשות והצגת היסטוריית השאלות
              </p>
            </CardContent>
          </Card>

          <Card className="border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
            <CardContent className="p-2 text-center">
              <div className="text-2xl mb-1">✅</div>
              <h3 className="text-xs font-bold text-gray-800 mb-0.5">ציוד מגוון</h3>
              <p className="text-[10px] text-gray-600 leading-tight">
                מגוון רחב של ציוד זמין להשאלה - כל מה שאתה צריך במקום אחד
              </p>
            </CardContent>
          </Card>
        </div>

        {/* User Guide - Compact */}
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg mt-8">
          <CardContent className="p-4">
            <div className="text-center mb-3">
              <h3 className="text-lg font-bold text-purple-800">📖 איך זה עובד?</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
              <div className="bg-white/60 rounded-lg p-2 text-center">
                <div className="text-xl mb-1">1️⃣</div>
                <p className="text-xs font-semibold text-gray-800">בחר עיר</p>
              </div>
              <div className="bg-white/60 rounded-lg p-2 text-center">
                <div className="text-xl mb-1">2️⃣</div>
                <p className="text-xs font-semibold text-gray-800">בחר ציוד</p>
              </div>
              <div className="bg-white/60 rounded-lg p-2 text-center">
                <div className="text-xl mb-1">3️⃣</div>
                <p className="text-xs font-semibold text-gray-800">הזן פרטים</p>
              </div>
              <div className="bg-white/60 rounded-lg p-2 text-center">
                <div className="text-xl mb-1">4️⃣</div>
                <p className="text-xs font-semibold text-gray-800">קבל אישור</p>
              </div>
              <div className="bg-white/60 rounded-lg p-2 text-center">
                <div className="text-xl mb-1">5️⃣</div>
                <p className="text-xs font-semibold text-gray-800">קבל ציוד</p>
              </div>
              <div className="bg-white/60 rounded-lg p-2 text-center">
                <div className="text-xl mb-1">6️⃣</div>
                <p className="text-xs font-semibold text-gray-800">החזר בזמן</p>
              </div>
            </div>
            <div className="flex justify-center">
              <Link href="/user-guide">
                <Button size="sm" className="gap-1 bg-purple-600 hover:bg-purple-700 text-white text-xs">
                  📖 מדריך מפורט
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
