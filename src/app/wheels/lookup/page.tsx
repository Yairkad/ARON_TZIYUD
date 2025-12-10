'use client'

import { useState } from 'react'
import Link from 'next/link'

interface VehicleData {
  plate: number
  manufacturer: string
  model: string
  model_name: string
  year: number
  color: string
  front_tire: string
  rear_tire: string
}

interface WheelFitment {
  bolt_count: number
  bolt_spacing: number
  pcd: string
  center_bore?: number
}

interface LookupResponse {
  success: boolean
  vehicle: VehicleData
  wheel_fitment: WheelFitment | null
  pcd_found: boolean
  error?: string
}

export default function VehicleLookupPage() {
  const [plate, setPlate] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<LookupResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!plate.trim()) {
      setError('נא להזין מספר רישוי')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`/api/vehicle/lookup?plate=${encodeURIComponent(plate)}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'שגיאה בחיפוש')
        return
      }

      setResult(data)
    } catch {
      setError('שגיאה בחיבור לשרת')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">
              חיפוש גלגל לפי מספר רישוי
            </h1>
            <Link
              href="/wheels"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              חזרה לתחנות
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Search Box */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                מספר רישוי
              </label>
              <input
                type="text"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="לדוגמה: 12-345-67"
                className="w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-center tracking-widest"
                style={{ direction: 'ltr' }}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    מחפש...
                  </span>
                ) : 'חפש'}
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-8">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Vehicle Info */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-2xl">🚗</span>
                פרטי הרכב
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-gray-500">יצרן</span>
                  <p className="font-medium">{result.vehicle.manufacturer}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">דגם</span>
                  <p className="font-medium">{result.vehicle.model}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">שנה</span>
                  <p className="font-medium">{result.vehicle.year}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">צבע</span>
                  <p className="font-medium">{result.vehicle.color}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">צמיג קדמי</span>
                  <p className="font-medium" style={{ direction: 'ltr' }}>{result.vehicle.front_tire}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">צמיג אחורי</span>
                  <p className="font-medium" style={{ direction: 'ltr' }}>{result.vehicle.rear_tire}</p>
                </div>
              </div>
            </div>

            {/* Wheel Fitment */}
            {result.wheel_fitment ? (
              <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2">
                  <span className="text-2xl">✅</span>
                  נמצא! מידות גלגל מתאימות
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <div className="bg-white rounded-xl p-4 text-center shadow">
                    <span className="text-sm text-gray-500">PCD</span>
                    <p className="text-2xl font-bold text-green-700">{result.wheel_fitment.pcd}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center shadow">
                    <span className="text-sm text-gray-500">כמות חורים</span>
                    <p className="text-2xl font-bold text-gray-800">{result.wheel_fitment.bolt_count}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center shadow">
                    <span className="text-sm text-gray-500">מרחק (מ"מ)</span>
                    <p className="text-2xl font-bold text-gray-800">{result.wheel_fitment.bolt_spacing}</p>
                  </div>
                  {result.wheel_fitment.center_bore && (
                    <div className="bg-white rounded-xl p-4 text-center shadow">
                      <span className="text-sm text-gray-500">קוטר מרכזי</span>
                      <p className="text-2xl font-bold text-gray-800">{result.wheel_fitment.center_bore}</p>
                    </div>
                  )}
                </div>

                {/* Search Link */}
                <div className="mt-6 text-center">
                  <Link
                    href={`/wheels/search?bolt_count=${result.wheel_fitment.bolt_count}&bolt_spacing=${result.wheel_fitment.bolt_spacing}`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors"
                  >
                    <span>🔍</span>
                    חפש גלגלים מתאימים במלאי
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-yellow-800 mb-2 flex items-center gap-2">
                  <span className="text-2xl">⚠️</span>
                  לא נמצאו מידות גלגל
                </h2>
                <p className="text-yellow-700">
                  הדגם {result.vehicle.manufacturer} {result.vehicle.model} {result.vehicle.year} לא נמצא במאגר שלנו.
                </p>
                <p className="text-yellow-600 text-sm mt-2">
                  ניתן לחפש ידנית באתר wheel-size.com או לפנות למנהל התחנה.
                </p>
                <div className="mt-4">
                  <a
                    href={`https://www.wheel-size.com/size/${result.vehicle.model.toLowerCase()}/${result.vehicle.year}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                  >
                    חפש ב-wheel-size.com
                    <span>↗</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        {!result && !loading && (
          <div className="bg-gray-50 rounded-2xl p-6 text-center">
            <p className="text-gray-600 mb-4">
              הזן מספר רישוי של הרכב כדי לקבל את מידות הגלגל המתאימות
            </p>
            <div className="text-sm text-gray-500 space-y-1">
              <p>• המערכת מחפשת במאגר משרד התחבורה</p>
              <p>• תומך במספרי רישוי עם או בלי מקפים</p>
              <p>• לדוגמה: 5765111 או 57-651-11</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
