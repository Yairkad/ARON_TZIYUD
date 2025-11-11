'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { City } from '@/types'
import { Phone, MessageCircle, ArrowLeft, Search } from 'lucide-react'
import Logo from '@/components/Logo'

export default function HomePage() {
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchCities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`
  }

  const handleWhatsApp = (phone: string) => {
    // Remove leading 0 and add +972 for Israeli numbers
    const formattedPhone = phone.startsWith('0') ? `972${phone.slice(1)}` : phone
    window.open(`https://wa.me/${formattedPhone}`, '_blank')
  }

  // Filter cities based on search query
  const filteredCities = cities.filter(city =>
    city.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    city.manager1_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    city.manager2_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen content-wrapper">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Logo */}
        <Logo />

        {/* Header */}
        <header className="text-center mb-6 sm:mb-12">
          <div className="bg-white/90 backdrop-blur-lg border border-gray-200/50 rounded-2xl shadow-xl p-4 sm:p-8 relative">
            <Link href="/super-admin" className="absolute left-3 sm:left-6 top-3 sm:top-6">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full hover:bg-blue-50 text-blue-600 transition-all duration-200 hover:scale-110"
                title="כניסת מנהל ראשי"
              >
                🔐
              </Button>
            </Link>
            <p className="text-gray-600 text-base sm:text-lg">בחר עיר כדי להתחיל</p>
          </div>
        </header>

        {/* Search Bar */}
        {!loading && cities.length > 0 && (
          <div className="mb-8">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-lg">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="חפש עיר לפי שם העיר או שם המנהל..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-12 pr-10 text-lg border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                  />
                </div>
                {searchQuery && (
                  <p className="text-sm text-gray-600 mt-2">
                    נמצאו {filteredCities.length} תוצאות
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Cities Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600">טוען ערים...</p>
          </div>
        ) : cities.length === 0 ? (
          <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
            <CardContent className="p-8 text-center">
              <p className="text-xl text-orange-700 font-semibold">
                ⚠️ אין ערים פעילות במערכת כרגע
              </p>
              <p className="text-gray-600 mt-2">אנא פנה למנהל המערכת</p>
            </CardContent>
          </Card>
        ) : filteredCities.length === 0 ? (
          <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="p-8 text-center">
              <p className="text-xl text-blue-700 font-semibold">
                🔍 לא נמצאו ערים התואמות לחיפוש
              </p>
              <p className="text-gray-600 mt-2">נסה לחפש במילים אחרות</p>
              <Button
                onClick={() => setSearchQuery('')}
                className="mt-4 bg-blue-600 hover:bg-blue-700"
              >
                נקה חיפוש
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCities.map(city => (
              <Card
                key={city.id}
                className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white overflow-hidden"
              >
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-4">
                  <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <span className="text-3xl">🏙️</span>
                    {city.name}
                  </CardTitle>
                  <CardDescription className="text-base">
                    <div className="space-y-2 mt-3">
                      {/* Manager 1 */}
                      <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">👤</span>
                          <span className="font-semibold text-gray-700">{city.manager1_name}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            onClick={() => handleWhatsApp(city.manager1_phone)}
                            size="icon"
                            className="h-8 w-8 bg-green-500 hover:bg-green-600 rounded-full"
                            title="WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleCall(city.manager1_phone)}
                            size="icon"
                            className="h-8 w-8 bg-blue-500 hover:bg-blue-600 rounded-full"
                            title="חייג"
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {/* Manager 2 - Only show if exists */}
                      {city.manager2_name && city.manager2_phone && (
                        <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-200">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">👤</span>
                            <span className="font-semibold text-gray-700">{city.manager2_name}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              onClick={() => handleWhatsApp(city.manager2_phone!)}
                              size="icon"
                              className="h-8 w-8 bg-green-500 hover:bg-green-600 rounded-full"
                              title="WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleCall(city.manager2_phone!)}
                              size="icon"
                              className="h-8 w-8 bg-blue-500 hover:bg-blue-600 rounded-full"
                              title="חייג"
                            >
                              <Phone className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                      {/* Navigation Buttons */}
                      {city.location_url && (() => {
                        // Use coordinates from DB if available, otherwise fall back to location_url
                        const lat = city.lat
                        const lng = city.lng

                        const googleMapsUrl = lat && lng
                          ? `https://www.google.com/maps?q=${lat},${lng}`
                          : city.location_url

                        const wazeUrl = lat && lng
                          ? `https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes&zoom=17`
                          : city.location_url

                        return (
                          <div className="flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-200">
                            <span className="text-lg">🗺️</span>
                            <span className="font-semibold text-gray-700 flex-1">ניווט לארון:</span>
                            <div className="flex gap-1">
                              <a
                                href={googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-8 w-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors"
                                title="Google Maps"
                              >
                                <span className="text-xs">📍</span>
                              </a>
                              <a
                                href={wazeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-8 w-8 bg-cyan-500 hover:bg-cyan-600 text-white rounded-full flex items-center justify-center transition-colors"
                                title="Waze"
                              >
                                <span className="text-xs">🚗</span>
                              </a>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">

                  {/* Enter System Button */}
                  <Link href={`/city/${city.id}`} className="block">
                    <Button className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
                      <ArrowLeft className="h-5 w-5 ml-2" />
                      כניסה למערכת
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-12 text-center space-y-4">
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
            <CardContent className="p-6">
              <p className="text-gray-700 text-lg">
                💡 על מנת לבצע השאלה יש לבצע תיאום מול מנהלי היחידה
              </p>
              <p className="text-gray-600 text-sm mt-2">
                כל עיר מנוהלת באופן עצמאי עם מלאי ציוד נפרד
              </p>
            </CardContent>
          </Card>

          {/* User Guide Link */}
          <a
            href="/user-guide-regular.html"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button
              variant="outline"
              className="w-full sm:w-auto px-8 py-6 text-lg font-semibold border-2 border-purple-500 text-purple-600 hover:bg-purple-50 hover:border-purple-600 transition-all duration-200 rounded-xl shadow-md hover:shadow-lg"
            >
              📚 מדריך למשתמש - איך משאילים ציוד?
            </Button>
          </a>
        </div>
      </div>
    </div>
  )
}
