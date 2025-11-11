'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Logo from '@/components/Logo'
import { checkAuth } from '@/lib/auth'

export default function UnifiedLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Note: We don't check auth here to avoid redirect loops
  // Users will be redirected after successful login

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, rememberMe })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Login successful, redirect to appropriate page
        console.log('Login successful, redirecting to:', data.redirectPath)
        router.push(data.redirectPath)
      } else {
        setError(data.error || 'שגיאה בהתחברות')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('שגיאה בתהליך ההתחברות')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen content-wrapper flex flex-col items-center justify-center p-4 gap-8 relative">
      {/* Back to Home Button */}
      <Link href="/" className="absolute top-4 left-4">
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-3 rounded-full hover:bg-blue-50 text-blue-600 transition-all duration-200 hover:scale-105 border border-blue-200"
        >
          ↩️ חזור לדף הבית
        </Button>
      </Link>

      {/* Logo Section */}
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center gap-2 mb-4">
          {/* Logo Image */}
          <div className="w-32 h-11 sm:w-40 sm:h-14">
            <img
              src="/logo.png"
              alt="ארון ציוד ידידים"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="text-center">
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              ארון ציוד ידידים
            </h1>
            <p className="text-xs text-gray-600">מערכת השאלות וניהול ציוד</p>
          </div>
        </div>
      </div>

      <Card className="w-full max-w-md border-0 shadow-2xl rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white pb-8">
          <div className="text-center">
            <div className="text-5xl mb-4">🔐</div>
            <CardTitle className="text-3xl font-bold mb-2">התחברות למערכת</CardTitle>
            <CardDescription className="text-purple-100 text-base">
              הזן את פרטי ההתחברות שלך
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">📧 כתובת מייל</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="h-12 border-2 border-gray-200 rounded-xl focus:border-purple-500 transition-colors"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">🔑 סיסמה</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 border-2 border-gray-200 rounded-xl focus:border-purple-500 transition-colors"
                required
                disabled={loading}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                disabled={loading}
              />
              <label htmlFor="rememberMe" className="mr-2 text-sm text-gray-700 cursor-pointer">
                זכור אותי (30 יום)
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              {loading ? '⏳ מתחבר...' : '🚀 התחבר'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">💡 טיפ:</span> עמוד זה משמש לכל סוגי המשתמשים במערכת
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
