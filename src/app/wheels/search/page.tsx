'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Wheel {
  id: string
  wheel_number: string
  rim_size: string
  bolt_count: number
  bolt_spacing: number
  category: string | null
  is_donut: boolean
  is_available: boolean
}

interface StationResult {
  station: {
    id: string
    name: string
    address: string
    city: string | null
  }
  wheels: Wheel[]
  availableCount: number
  totalCount: number
}

interface SearchResponse {
  results: StationResult[]
  totalWheels: number
  totalAvailable: number
  filterOptions: {
    rim_sizes: string[]
    bolt_counts: number[]
    bolt_spacings: number[]
  }
}

function SearchContent() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<SearchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Get filters from URL
  const boltCount = searchParams.get('bolt_count')
  const boltSpacing = searchParams.get('bolt_spacing')
  const rimSize = searchParams.get('rim_size')
  const pcd = boltCount && boltSpacing ? `${boltCount}x${boltSpacing}` : null

  useEffect(() => {
    const fetchWheels = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (boltCount) params.set('bolt_count', boltCount)
        if (boltSpacing) params.set('bolt_spacing', boltSpacing)
        if (rimSize) params.set('rim_size', rimSize)
        params.set('available_only', 'true')

        const response = await fetch(`/api/wheel-stations/search?${params}`)
        const result = await response.json()

        if (!response.ok) {
          setError(result.error || 'שגיאה בחיפוש')
          return
        }

        setData(result)
      } catch {
        setError('שגיאה בחיבור לשרת')
      } finally {
        setLoading(false)
      }
    }

    fetchWheels()
  }, [boltCount, boltSpacing, rimSize])

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                חיפוש גלגלים במלאי
              </h1>
              {(pcd || rimSize) && (
                <p className="text-blue-600 font-medium">
                  מחפש גלגלים {pcd ? `עם PCD: ${pcd}` : ''}{pcd && rimSize ? ' | ' : ''}{rimSize ? `גודל ${rimSize}"` : ''}
                </p>
              )}
            </div>
            <Link
              href="/wheels/lookup"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              חזרה לחיפוש לפי רישוי
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 text-gray-600">
              <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              מחפש גלגלים...
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
            {error}
          </div>
        )}

        {/* Results */}
        {!loading && data && (
          <>
            {/* Summary */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
              <div className="flex flex-wrap items-center gap-6">
                <div className="text-center px-6 py-3 bg-blue-50 rounded-xl">
                  <p className="text-3xl font-bold text-blue-600">{data.totalAvailable}</p>
                  <p className="text-sm text-gray-600">גלגלים זמינים</p>
                </div>
                <div className="text-center px-6 py-3 bg-gray-50 rounded-xl">
                  <p className="text-3xl font-bold text-gray-600">{data.results.length}</p>
                  <p className="text-sm text-gray-600">תחנות</p>
                </div>
                {(pcd || rimSize) && (
                  <div className="flex-1 flex flex-wrap gap-2 justify-end">
                    {pcd && (
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        <span>PCD:</span>
                        <span className="font-bold">{pcd}</span>
                      </span>
                    )}
                    {rimSize && (
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        <span>חישוק:</span>
                        <span className="font-bold">{rimSize}"</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* No Results */}
            {data.results.length === 0 && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-8 text-center">
                <span className="text-4xl mb-4 block">😔</span>
                <h2 className="text-xl font-bold text-yellow-800 mb-2">
                  לא נמצאו גלגלים זמינים
                </h2>
                <p className="text-yellow-700">
                  {pcd || rimSize ?
                    `אין גלגלים זמינים${pcd ? ` עם PCD ${pcd}` : ''}${pcd && rimSize ? ' ו' : ''}${rimSize ? `בגודל ${rimSize}"` : ''}`
                    : 'אין גלגלים זמינים כרגע'}
                </p>
                <Link
                  href="/wheels"
                  className="inline-block mt-4 px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  צפה בכל התחנות
                </Link>
              </div>
            )}

            {/* Station Results */}
            <div className="space-y-6">
              {data.results.map((result) => (
                <div key={result.station.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  {/* Station Header */}
                  <div className="bg-gradient-to-l from-blue-500 to-blue-600 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-white">{result.station.name}</h3>
                        <p className="text-blue-100 text-sm">{result.station.address}</p>
                        {result.station.city && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-white/20 text-white text-xs rounded">
                            {result.station.city}
                          </span>
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-3xl font-bold text-white">{result.availableCount}</p>
                        <p className="text-blue-100 text-sm">זמינים</p>
                      </div>
                    </div>
                  </div>

                  {/* Wheels Grid */}
                  <div className="p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {result.wheels.filter(w => w.is_available).map((wheel) => (
                        <div
                          key={wheel.id}
                          className={`bg-gray-50 rounded-xl p-4 text-center border-2 ${wheel.is_donut ? 'border-orange-200' : 'border-gray-100'} hover:border-blue-300 transition-colors`}
                        >
                          <p className="font-bold text-gray-800 text-lg">#{wheel.wheel_number}</p>
                          <p className="text-sm text-gray-600">{wheel.rim_size}"</p>
                          <p className="text-xs text-blue-600 font-medium mt-1">
                            {wheel.bolt_count}×{wheel.bolt_spacing}
                          </p>
                          {wheel.is_donut && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                              דונאט
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Link to Station */}
                    <div className="mt-4 text-center">
                      <Link
                        href={`/wheels/${result.station.id}`}
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        צפה בכל הגלגלים בתחנה
                        <span>←</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default function WheelSearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  )
}
