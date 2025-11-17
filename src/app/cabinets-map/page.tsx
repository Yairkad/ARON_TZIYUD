'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Dynamically import the map component to avoid SSR issues with Leaflet
const CabinetsMap = dynamic(() => import('@/components/CabinetsMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] flex items-center justify-center bg-gray-100 rounded-xl">
      <div className="text-center">
        <div className="text-4xl mb-2">🗺️</div>
        <p className="text-gray-600">טוען מפה...</p>
      </div>
    </div>
  )
})

export default function CabinetsMapPage() {
  return (
    <div className="min-h-screen content-wrapper">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Logo />

        {/* Header */}
        <header className="bg-white/90 backdrop-blur-lg border border-gray-200/50 rounded-2xl shadow-xl p-4 sm:p-8 mb-6 sm:mb-8 relative">
          {/* Back button */}
          <Link href="/" className="absolute left-4 sm:left-6 top-4 sm:top-6">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-3 rounded-full hover:bg-blue-50 text-blue-600 transition-all duration-200 hover:scale-105 border border-blue-200"
            >
              ↩️ חזרה לדף הבית
            </Button>
          </Link>

          <div className="text-center pt-8 sm:pt-0">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              🗺️ מפת ארונות ציוד
            </h1>
            <p className="text-gray-600 text-base sm:text-lg">
              מצא את הארון הקרוב אליך
            </p>
          </div>
        </header>

        {/* Info Card */}
        <Card className="mb-6 border-0 shadow-lg rounded-2xl overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-white/60 rounded-xl">
                <div className="text-2xl mb-2">📍</div>
                <h3 className="font-semibold text-gray-800 text-sm mb-1">מיקום משוער</h3>
                <p className="text-xs text-gray-600">
                  העיגולים מציגים מיקום משוער בלבד (±750 מטר)
                </p>
              </div>
              <div className="text-center p-3 bg-white/60 rounded-xl">
                <div className="text-2xl mb-2">👆</div>
                <h3 className="font-semibold text-gray-800 text-sm mb-1">לחץ על עיגול</h3>
                <p className="text-xs text-gray-600">
                  לחץ על עיגול כדי לפתוח את מסך הבקשה של הארון
                </p>
              </div>
              <div className="text-center p-3 bg-white/60 rounded-xl">
                <div className="text-2xl mb-2">🧭</div>
                <h3 className="font-semibold text-gray-800 text-sm mb-1">נווט למיקום</h3>
                <p className="text-xs text-gray-600">
                  לאחר קבלת אישור - תקבל ניווט מדויק לארון
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Map Card */}
        <Card className="border-0 shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-4">
            <CardTitle className="text-xl sm:text-2xl font-bold text-gray-800">
              מיקומי הארונות
            </CardTitle>
            <CardDescription className="text-gray-600 text-sm sm:text-base">
              המפה מציגה מיקום משוער בלבד - לא ניתן לנווט ישירות מכאן
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Suspense fallback={
              <div className="w-full h-[600px] flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <div className="text-4xl mb-2">🗺️</div>
                  <p className="text-gray-600">טוען מפה...</p>
                </div>
              </div>
            }>
              <CabinetsMap />
            </Suspense>
          </CardContent>
        </Card>

        {/* Help Card */}
        <Card className="mt-6 border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="text-center">
              <h3 className="text-lg font-bold text-purple-800 mb-3">💡 טיפים שימושיים</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
                <div className="bg-white/60 rounded-lg p-3 text-right">
                  <span className="font-semibold">🔵 עיגול כחול:</span> מיקום משוער של ארון ציוד
                </div>
                <div className="bg-white/60 rounded-lg p-3 text-right">
                  <span className="font-semibold">🔵 נקודה כחולה:</span> המיקום שלך (אם אישרת גישה)
                </div>
                <div className="bg-white/60 rounded-lg p-3 text-right">
                  <span className="font-semibold">📱 בקשת ציוד:</span> לחץ על עיגול לפתיחת טופס בקשה
                </div>
                <div className="bg-white/60 rounded-lg p-3 text-right">
                  <span className="font-semibold">🗺️ ניווט מדויק:</span> יתאפשר רק לאחר אישור המנהל
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
