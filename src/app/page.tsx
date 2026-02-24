'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { City } from '@/types'
import Logo from '@/components/Logo'
import { ChevronDown } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [adminUrl, setAdminUrl] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchCities()
    checkAdminStatus()
  }, [])

  const checkAdminStatus = async () => {
    try {
      // Use API endpoint for more reliable auth check (uses cookies)
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      })

      if (!response.ok) {
        setAdminUrl(null)
        return
      }

      const data = await response.json()

      if (data.success && data.user) {
        if (data.user.role === 'super_admin') {
          setAdminUrl('/super-admin')
        } else if (data.user.role === 'city_manager' && data.user.city_id) {
          setAdminUrl(`/city/${data.user.city_id}/admin`)
        } else {
          setAdminUrl(null)
        }
      } else {
        setAdminUrl(null)
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
    router.push(`/city/${city.id}`)
  }

  // Show loading screen while fetching data
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex flex-col items-center justify-center">
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(0.95); }
          }
        `}</style>
        <img
          src="/logo.png"
          alt="טוען..."
          className="w-48 h-48 object-contain mb-4"
          style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
        />
        <p className="text-white text-lg">טוען...</p>
      </div>
    )
  }

  return (
    <>
    <div className="min-h-screen content-wrapper flex flex-col items-center justify-center p-4 pt-16 sm:pt-4 relative">
      {/* Admin Login Button - Only show when not logged in as admin */}
      {!adminUrl && (
        <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10">
          <Button
            onClick={() => router.push('/login')}
            variant="ghost"
            size="sm"
            className="h-8 sm:h-9 px-2 sm:px-3 rounded-full hover:bg-blue-50 text-blue-600 text-xs sm:text-sm font-medium transition-all duration-200 hover:scale-105 border border-blue-200 shadow-sm"
            title="כניסת מנהל"
          >
            <span className="hidden sm:inline">🔐 כניסת מנהל</span>
            <span className="sm:hidden">🔐</span>
          </Button>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Logo */}
        <div className="mb-8">
          <Logo />
        </div>

        {/* City Selector - Direct Search */}
        <div className="relative">
          <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-2xl">
            <CardContent className="p-8">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-gray-800 mb-2 text-center">
                  בחר עיר להתחלה
                </h3>

                {/* Search Input - Always Visible */}
                <div className="relative mb-4">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                    🔍
                  </span>
                  <Input
                    type="text"
                    placeholder="חפש עיר..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10 h-14 border-2 border-gray-200 focus:border-blue-400 text-lg"
                  />
                </div>

                {cities.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">אין ערים זמינות כרגע</p>
                  </div>
                ) : (
                  <div className="max-h-[200px] overflow-y-auto space-y-2">
                    {cities
                      .filter(city => city.name.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((city) => (
                      <button
                        key={city.id}
                        onClick={() => handleCitySelect(city)}
                        className="w-full p-4 rounded-xl bg-white border-2 border-gray-200 hover:border-blue-400 transition-all duration-200 hover:shadow-md hover:scale-[1.02] text-center"
                      >
                        <h4 className="font-bold text-lg text-gray-800">
                          {city.name}
                        </h4>
                      </button>
                    ))}
                    {cities.filter(city => city.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-gray-500">לא נמצאו ערים התואמות לחיפוש</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map Button - Prominent */}
        <div className="mt-8">
          <Link href="/cabinets-map">
            <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-100 to-indigo-100 shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105 cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="text-5xl mb-3">🗺️</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">מפת ארונות</h3>
                <p className="text-sm text-gray-700 leading-tight">
                  מצא את הארון הקרוב אליך במפה ופתח בקשה ישירות
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-3 gap-3 mt-6">
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
              <a href="/volunteer-guide.html" target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="gap-1 bg-purple-600 hover:bg-purple-700 text-white text-xs">
                  📖 מדריך ויזואלי למתנדב
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Footer with Feedback Link */}
        <div className="mt-12 pb-20">
          <div className="text-center py-4 border-t border-gray-200">
            <p className="text-gray-400 text-xs">
              מערכת ארון ציוד ידידים •{' '}
              <Link href="/feedback?source=volunteer" className="text-indigo-500 hover:text-indigo-600 hover:underline">
                דווח על בעיה או הצע שיפור
              </Link>
            </p>
            <p className="text-gray-400 text-xs mt-1">
              <Link href="/privacy" className="text-gray-500 hover:text-gray-600 hover:underline">
                מדיניות פרטיות
              </Link>
              {' • '}
              <Link href="/accessibility" className="text-gray-500 hover:text-gray-600 hover:underline">
                הצהרת נגישות
              </Link>
            </p>
            <p className="text-gray-300 text-[10px] mt-2">
              גירסה 2.7.1
            </p>
          </div>
        </div>
      </div>
    </div>

    {/* Floating Admin Bar - Show when logged in as admin */}
    {adminUrl && (
      <div
        id="admin-floating-bar"
        className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 shadow-lg flex items-center justify-between safe-area-bottom"
        style={{ zIndex: 9999 }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">👁️</span>
          <span className="text-sm font-medium">צפייה בממשק מתנדב</span>
        </div>
        <Button
          onClick={() => router.push(adminUrl)}
          className="bg-white text-purple-600 hover:bg-purple-50 font-bold px-4 py-2 rounded-xl transition-all hover:scale-105"
        >
          ⚙️ חזרה לניהול
        </Button>
      </div>
    )}
    </>
  )
}
