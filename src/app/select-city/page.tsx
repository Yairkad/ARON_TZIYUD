'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface City {
  id: string
  name: string
  role: 'manager1' | 'manager2'
}

export default function SelectCityPage() {
  const router = useRouter()
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCities()
  }, [])

  const fetchCities = async () => {
    try {
      const response = await fetch('/api/auth/my-cities', {
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        // If user is not authenticated or has no cities, redirect to login
        if (response.status === 401 || response.status === 403) {
          router.push('/login')
          return
        }
        throw new Error(data.error || 'שגיאה בטעינת ערים')
      }

      // If user has only one city, redirect directly to it
      if (data.cities.length === 1) {
        router.push(`/city/${data.cities[0].id}/admin`)
        return
      }

      // If user has no cities, show error
      if (data.cities.length === 0) {
        setError('לא נמצאו ערים משויכות למשתמש זה. אנא פנה למנהל המערכת.')
        setLoading(false)
        return
      }

      setCities(data.cities)
      setLoading(false)
    } catch (err: any) {
      console.error('Error fetching cities:', err)
      setError(err.message || 'שגיאה בטעינת ערים')
      setLoading(false)
    }
  }

  const handleCitySelect = (cityId: string) => {
    router.push(`/city/${cityId}/admin`)
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      router.push('/login')
    } catch (err) {
      console.error('Logout error:', err)
      router.push('/login')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="text-6xl mb-4">⏳</div>
              <p className="text-gray-600 text-lg">טוען ערים...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">שגיאה</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={handleLogout}
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                חזור להתחברות
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="text-center border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-xl">
          <CardTitle className="text-3xl font-bold">
            🏙️ בחר עיר לניהול
          </CardTitle>
          <p className="text-blue-100 mt-2">
            אתה מנהל {cities.length} ערים. בחר עיר להמשך
          </p>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {cities.map((city) => (
              <button
                key={city.id}
                onClick={() => handleCitySelect(city.id)}
                className="group relative p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:shadow-lg transition-all duration-200 hover:scale-105 text-right"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-3xl">🏙️</div>
                  <div className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                    {city.role === 'manager1' ? 'מנהל ראשי' : 'מנהל משני'}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {city.name}
                </h3>
                <p className="text-sm text-gray-500">
                  לחץ לכניסה לממשק הניהול
                </p>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  ←
                </div>
              </button>
            ))}
          </div>

          <div className="border-t pt-6">
            <button
              onClick={handleLogout}
              className="w-full h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all duration-200"
            >
              🚪 התנתק
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
