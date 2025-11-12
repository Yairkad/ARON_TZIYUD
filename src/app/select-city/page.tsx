'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { checkAuth } from '@/lib/auth'
import { City } from '@/types'

export default function SelectCityPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [cities, setCities] = useState<(City & { manager_role?: string })[]>([])
  const [userId, setUserId] = useState<string>('')

  useEffect(() => {
    fetchUserCities()
  }, [])

  const fetchUserCities = async () => {
    try {
      // Check authentication
      const auth = await checkAuth()
      if (!auth.authenticated) {
        router.push('/login')
        return
      }

      setUserId(auth.userId!)

      // Check if user is super admin - redirect directly
      if (auth.userType === 'super') {
        router.push('/super-admin')
        return
      }

      // Fetch cities for this user
      const response = await fetch('/api/user/cities', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch cities')
      }

      const data = await response.json()

      if (!data.success || !data.cities || data.cities.length === 0) {
        alert('לא נמצאו ערים המשוייכות למשתמש זה. אנא פנה למנהל המערכת.')
        router.push('/login')
        return
      }

      setCities(data.cities)

      // If user has only one city, redirect directly
      if (data.cities.length === 1) {
        await selectCity(data.cities[0].city_id)
        return
      }

    } catch (error) {
      console.error('Error fetching cities:', error)
      alert('שגיאה בטעינת ערים')
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const selectCity = async (cityId: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/user/select-city', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ cityId })
      })

      if (!response.ok) {
        throw new Error('Failed to select city')
      }

      const data = await response.json()

      if (data.success) {
        // Redirect to city admin page
        router.push(`/city/${cityId}/admin`)
      } else {
        alert(data.error || 'שגיאה בבחירת עיר')
      }
    } catch (error) {
      console.error('Error selecting city:', error)
      alert('שגיאה בבחירת עיר')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">טוען ערים...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">בחירת עיר לניהול</h1>
          <p className="text-gray-600 text-lg">בחר את העיר שברצונך לנהל</p>
        </div>

        {/* Cities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cities.map((cityData) => (
            <button
              key={cityData.city_id}
              onClick={() => selectCity(cityData.city_id)}
              className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border-2 border-transparent hover:border-blue-500 transform hover:scale-105"
              disabled={loading}
            >
              <div className="text-center">
                {/* City Icon */}
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  🏙️
                </div>

                {/* City Name */}
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  {cityData.name}
                </h3>

                {/* Manager Role Badge */}
                {cityData.manager_role && (
                  <div className="inline-block px-4 py-1.5 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full mb-4">
                    <span className="text-sm font-semibold text-blue-700">
                      {cityData.manager_role === 'manager1' ? '👤 מנהל ראשון' : '👥 מנהל שני'}
                    </span>
                  </div>
                )}

                {/* Enter Button */}
                <div className="mt-4 flex items-center justify-center gap-2 text-blue-600 font-semibold group-hover:text-blue-700">
                  <span>כניסה לניהול</span>
                  <span className="text-xl group-hover:translate-x-1 transition-transform duration-300">
                    ←
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Logout Button */}
        <div className="mt-12 text-center">
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
              })
              router.push('/login')
            }}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition-colors duration-200"
          >
            🚪 התנתק
          </button>
        </div>
      </div>
    </div>
  )
}
