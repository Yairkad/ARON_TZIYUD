'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
    <div className="min-h-screen content-wrapper flex flex-col items-center justify-center p-4 pt-20 sm:pt-4 relative">
      {/* Admin Login Button - Small, top corner */}
      <div className="absolute top-4 left-4 z-10">
        <Button
          onClick={() => router.push('/login')}
          variant="ghost"
          size="sm"
          className="h-9 px-3 rounded-full hover:bg-blue-50 text-blue-600 text-sm font-medium transition-all duration-200 hover:scale-105 border border-blue-200"
          title="כניסת מנהל"
        >
          🔐 כניסת מנהל
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

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12">
          <Card className="border border-gray-200 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-2">📦</div>
              <h4 className="font-bold text-gray-800 mb-1">השאלת ציוד</h4>
              <p className="text-sm text-gray-600">השאל ציוד בקלות ובמהירות</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-2">📊</div>
              <h4 className="font-bold text-gray-800 mb-1">מעקב והיסטוריה</h4>
              <p className="text-sm text-gray-600">עקוב אחר השאלות והחזרות</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-2">🔔</div>
              <h4 className="font-bold text-gray-800 mb-1">התראות</h4>
              <p className="text-sm text-gray-600">קבל התראות על בקשות חדשות</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
