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
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 sm:px-3 rounded-full hover:bg-blue-50 text-blue-600 transition-all duration-200 hover:scale-105 border border-blue-200"
            >
              ↩️ <span className="hidden sm:inline">חזרה</span>
            </Button>
          </Link>

          <div className="text-center flex-1">
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              🗺️ מפת ארונות ציוד
            </h1>
          </div>

          <div className="w-8 sm:w-20"></div> {/* Spacer for balance */}
        </div>

        {/* Map Card */}
        <Card className="border-0 shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 py-2 px-4">
            <CardDescription className="text-gray-600 text-xs sm:text-sm text-center">
              📍 המפה מציגה מיקום משוער בלבד (±750 מטר)
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

        {/* Help Card - Compact */}
        <Card className="mt-3 border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardContent className="p-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-700">
              <div className="text-center">
                <span className="font-semibold">🔵</span> עיגול כחול = ארון
              </div>
              <div className="text-center">
                <span className="font-semibold">🔴</span> נקודה אדומה = אתה
              </div>
              <div className="text-center">
                <span className="font-semibold">👆</span> לחץ = פתח בקשה
              </div>
              <div className="text-center">
                <span className="font-semibold">🗺️</span> ניווט לאחר אישור
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
