'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { City } from '@/types'
import { Phone, MessageCircle, ArrowLeft } from 'lucide-react'

export default function HomePage() {
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)

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

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`
  }

  const handleWhatsApp = (phone: string) => {
    // Remove leading 0 and add +972 for Israeli numbers
    const formattedPhone = phone.startsWith('0') ? `972${phone.slice(1)}` : phone
    window.open(`https://wa.me/${formattedPhone}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="bg-white/80 backdrop-blur-lg border border-gray-200/50 rounded-2xl shadow-xl p-8 relative">
            <Link href="/super-admin" className="absolute left-6 top-6">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full hover:bg-blue-50 text-blue-600 transition-all duration-200 hover:scale-110"
                title="כניסת מנהל על"
              >
                🔐
              </Button>
            </Link>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
              ארון ציוד ידידים
            </h1>
            <p className="text-gray-600 text-xl">בחר את העיר שלך להתחיל</p>
          </div>
        </header>

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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cities.map(city => (
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
                            onClick={() => handleCall(city.manager1_phone)}
                            size="icon"
                            className="h-8 w-8 bg-green-500 hover:bg-green-600 rounded-full"
                            title="חייג"
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleWhatsApp(city.manager1_phone)}
                            size="icon"
                            className="h-8 w-8 bg-blue-500 hover:bg-blue-600 rounded-full"
                            title="WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {/* Manager 2 */}
                      <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">👤</span>
                          <span className="font-semibold text-gray-700">{city.manager2_name}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            onClick={() => handleCall(city.manager2_phone)}
                            size="icon"
                            className="h-8 w-8 bg-green-500 hover:bg-green-600 rounded-full"
                            title="חייג"
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleWhatsApp(city.manager2_phone)}
                            size="icon"
                            className="h-8 w-8 bg-blue-500 hover:bg-blue-600 rounded-full"
                            title="WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
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
        <div className="mt-12 text-center">
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
            <CardContent className="p-6">
              <p className="text-gray-700 text-lg">
                💡 <strong>טיפ:</strong> ניתן ליצור קשר עם מנהל היחידה לפני ההשאלה
              </p>
              <p className="text-gray-600 text-sm mt-2">
                כל עיר מנוהלת באופן עצמאי עם מלאי ציוד נפרד
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
