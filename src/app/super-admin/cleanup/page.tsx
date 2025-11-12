'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { checkAuth } from '@/lib/auth'

export default function CleanupUsersPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const verifyAuth = async () => {
      const { authenticated, userType } = await checkAuth()
      if (authenticated && userType === 'super') {
        setIsAuthenticated(true)
      } else {
        router.push('/login')
      }
      setIsCheckingAuth(false)
    }
    verifyAuth()
  }, [router])

  const runCleanup = async () => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את כל משתמשי city_manager?\n\nהסופר-אדמין לא יימחק.')) {
      return
    }

    try {
      setLoading(true)
      setError('')
      const response = await fetch('/api/debug/cleanup-all-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()

      if (data.success) {
        setResults(data)
      } else {
        setError(data.error)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen content-wrapper flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">בודק הרשאות...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen content-wrapper p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button onClick={() => router.push('/super-admin')} variant="outline">
            ← חזור לדף ראשי
          </Button>
        </div>

        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
          🗑️ ניקוי משתמשים
        </h1>
        <p className="text-gray-600 mb-8">
          מחיקת כל משתמשי city_manager מהמערכת
        </p>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
            ❌ {error}
          </div>
        )}

        {!results ? (
          <Card className="mb-6">
            <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50">
              <CardTitle>⚠️ אזהרה</CardTitle>
              <CardDescription>פעולה זו תמחק את כל משתמשי ה-city_manager</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="bg-yellow-50 border-2 border-yellow-200 p-4 rounded-xl mb-6">
                <p className="text-yellow-800 font-semibold mb-2">📌 מה יקרה:</p>
                <ul className="text-yellow-700 space-y-1 mr-6">
                  <li>✓ כל משתמשי city_manager יימחקו מ-Auth</li>
                  <li>✓ כל משתמשי city_manager יימחקו מטבלת users</li>
                  <li>✓ משתמשים עם מיילים admin@aron.local יימחקו</li>
                  <li>✓ הסופר-אדמין <strong>לא</strong> יימחק</li>
                </ul>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-xl mb-6">
                <p className="text-blue-800 font-semibold mb-2">💡 למה צריך ניקוי?</p>
                <p className="text-blue-700">
                  המיגרציה הקודמת נכשלה ויצרה משתמשים ב-Auth אבל לא בטבלת users.
                  הניקוי יאפשר להתחיל מחדש עם מערכת נקייה.
                </p>
              </div>

              <Button
                onClick={runCleanup}
                disabled={loading}
                className="w-full h-14 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold text-lg"
              >
                {loading ? '⏳ מוחק...' : '🧹 הפעל ניקוי'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle>✅ הניקוי הושלם</CardTitle>
              <CardDescription>המערכת מוכנה למיגרציה חדשה</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-red-50 p-4 rounded-xl text-center">
                  <div className="text-3xl font-bold text-red-600">{results.summary.auth_deleted}</div>
                  <div className="text-sm text-gray-600">נמחקו מ-Auth</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-xl text-center">
                  <div className="text-3xl font-bold text-orange-600">{results.summary.users_deleted}</div>
                  <div className="text-sm text-gray-600">נמחקו מ-users</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl text-center">
                  <div className="text-3xl font-bold text-gray-600">{results.summary.failed}</div>
                  <div className="text-sm text-gray-600">נכשלו</div>
                </div>
              </div>

              {results.deleted_from_auth && results.deleted_from_auth.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-4">🗑️ משתמשים שנמחקו:</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {results.deleted_from_auth.map((user: any, idx: number) => (
                      <div key={idx} className="border-2 border-gray-200 bg-gray-50 rounded-lg p-3">
                        <div className="font-semibold">{user.full_name}</div>
                        <div className="text-sm text-gray-600">{user.email}</div>
                        {user.note && (
                          <div className="text-xs text-gray-500 mt-1">{user.note}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.errors && results.errors.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-4 text-red-600">❌ שגיאות:</h3>
                  <div className="space-y-2">
                    {results.errors.map((err: any, idx: number) => (
                      <div key={idx} className="bg-red-50 border-2 border-red-200 rounded-lg p-3 text-red-700">
                        {err.email || 'Unknown'}: {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-green-50 border-2 border-green-200 p-4 rounded-xl mb-6 text-center">
                <p className="text-green-800 font-bold text-lg">✅ המערכת מוכנה למיגרציה חדשה!</p>
                <p className="text-green-700 mt-2">עכשיו תוכל להפעיל את המיגרציה מחדש</p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => router.push('/super-admin/migrate')}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                >
                  🔄 עבור למיגרציה
                </Button>
                <Button
                  onClick={() => router.push('/super-admin')}
                  className="w-full"
                  variant="outline"
                >
                  ✅ חזור לדף ראשי
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
