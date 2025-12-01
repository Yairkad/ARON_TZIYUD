'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { checkAuth } from '@/lib/auth'

export default function MigrateManagersPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [preview, setPreview] = useState<any>(null)
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean
    title: string
    message: string
    icon: string
    confirmText: string
    confirmColor: 'red' | 'green' | 'blue' | 'orange'
    onConfirm: () => void
    loading?: boolean
  } | null>(null)

  const showConfirmModal = (config: {
    title: string
    message: string
    icon: string
    confirmText: string
    confirmColor: 'red' | 'green' | 'blue' | 'orange'
    onConfirm: () => void
  }) => {
    setConfirmModal({ show: true, ...config, loading: false })
  }

  const closeConfirmModal = () => {
    setConfirmModal(null)
  }

  useEffect(() => {
    const verifyAuth = async () => {
      const { authenticated, userType } = await checkAuth()
      if (authenticated && userType === 'super') {
        setIsAuthenticated(true)
        loadPreview()
      } else {
        router.push('/login')
      }
      setIsCheckingAuth(false)
    }
    verifyAuth()
  }, [router])

  const loadPreview = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/debug/preview-migration')
      const data = await response.json()

      if (data.success) {
        setPreview(data)
      } else {
        setError(data.error)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const runMigration = async () => {
    showConfirmModal({
      title: 'מיגרציית מנהלים',
      message: 'האם אתה בטוח שברצונך ליצור משתמשים עבור כל המנהלים?',
      icon: '🔄',
      confirmText: 'הפעל מיגרציה',
      confirmColor: 'blue',
      onConfirm: async () => {
        setConfirmModal(prev => prev ? { ...prev, loading: true } : null)
        try {
          setError('')
          const response = await fetch('/api/debug/migrate-managers', {
            method: 'POST'
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
          closeConfirmModal()
        }
      }
    })
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
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button onClick={() => router.push('/super-admin')} variant="outline">
            ← חזור לדף ראשי
          </Button>
        </div>

        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          🔄 מיגרציה של מנהלי ערים
        </h1>
        <p className="text-gray-600 mb-8">
          המערכת תיצור משתמשים מהמנהלים הקיימים בטבלת הערים
        </p>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
            ❌ {error}
          </div>
        )}

        {/* Preview Section */}
        {!results && (
          <Card className="mb-6">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle>📋 תצוגה מקדימה</CardTitle>
              <CardDescription>רשימת המשתמשים שייווצרו</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {loading && !preview ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">⏳</div>
                  <p>טוען נתונים...</p>
                </div>
              ) : preview ? (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl text-center">
                      <div className="text-3xl font-bold text-blue-600">{preview.summary.total_cities}</div>
                      <div className="text-sm text-gray-600">ערים במערכת</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl text-center">
                      <div className="text-3xl font-bold text-purple-600">{preview.summary.cities_with_managers}</div>
                      <div className="text-sm text-gray-600">ערים עם מנהלים</div>
                    </div>
                    <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-4 rounded-xl text-center">
                      <div className="text-3xl font-bold text-pink-600">{preview.summary.total_managers_to_create}</div>
                      <div className="text-sm text-gray-600">משתמשים ייווצרו</div>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {preview.preview.map((city: any) => (
                      <div key={city.city_id} className="border-2 border-gray-200 rounded-xl p-4">
                        <div className="font-bold text-lg text-purple-600 mb-3">🏙️ {city.city_name}</div>
                        {city.managers.map((manager: any, idx: number) => (
                          <div key={idx} className="bg-gray-50 p-3 rounded-lg mb-2 font-mono text-sm">
                            <div>👤 {manager.name}</div>
                            <div>📧 <strong>{manager.email_will_be}</strong></div>
                            <div>🔑 {manager.password_will_be}</div>
                            <div>📱 {manager.phone}</div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="mt-6">
                    <Button
                      onClick={runMigration}
                      disabled={loading}
                      className="w-full h-14 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-lg"
                    >
                      {loading ? '⏳ מעבד...' : '🚀 הפעל מיגרציה'}
                    </Button>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {results && (
          <Card>
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle>✅ תוצאות מיגרציה</CardTitle>
              <CardDescription>המיגרציה הושלמה בהצלחה</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 p-4 rounded-xl text-center">
                  <div className="text-3xl font-bold text-green-600">{results.summary.success}</div>
                  <div className="text-sm text-gray-600">נוצרו בהצלחה</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-xl text-center">
                  <div className="text-3xl font-bold text-yellow-600">{results.summary.skipped}</div>
                  <div className="text-sm text-gray-600">דולגו (קיימים)</div>
                </div>
                <div className="bg-red-50 p-4 rounded-xl text-center">
                  <div className="text-3xl font-bold text-red-600">{results.summary.failed}</div>
                  <div className="text-sm text-gray-600">נכשלו</div>
                </div>
              </div>

              {results.processed.filter((p: any) => p.status === 'created').length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-4">✅ משתמשים שנוצרו:</h3>
                  <div className="space-y-3">
                    {results.processed.filter((p: any) => p.status === 'created').map((item: any, idx: number) => (
                      <div key={idx} className="border-2 border-green-200 bg-green-50 rounded-xl p-4">
                        <div className="font-bold text-lg text-green-700 mb-2">🏙️ {item.city}</div>
                        <div className="bg-white p-3 rounded-lg font-mono text-sm">
                          <div>👤 {item.manager}</div>
                          <div>📧 <strong className="text-green-600">{item.email}</strong></div>
                          <div>🔑 <strong className="text-green-600">{item.password}</strong></div>
                          <div>🎭 {item.role === 'manager1' ? 'מנהל ראשון' : 'מנהל שני'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6">
                <Button
                  onClick={() => router.push('/super-admin')}
                  className="w-full"
                  variant="outline"
                >
                  ✅ סיום - חזור לדף ראשי
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal && confirmModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeConfirmModal}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className={`p-6 rounded-t-2xl ${
              confirmModal.confirmColor === 'red' ? 'bg-gradient-to-r from-red-500 to-rose-500' :
              confirmModal.confirmColor === 'orange' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
              confirmModal.confirmColor === 'green' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
              'bg-gradient-to-r from-blue-500 to-cyan-500'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-4xl">{confirmModal.icon}</span>
                <h3 className="text-xl font-bold text-white">{confirmModal.title}</h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-700 text-lg">{confirmModal.message}</p>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <Button onClick={closeConfirmModal} disabled={confirmModal.loading} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700">
                ביטול
              </Button>
              <Button
                onClick={confirmModal.onConfirm}
                disabled={confirmModal.loading}
                className={`flex-1 text-white ${
                  confirmModal.confirmColor === 'red' ? 'bg-gradient-to-r from-red-500 to-rose-500' :
                  confirmModal.confirmColor === 'orange' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                  confirmModal.confirmColor === 'green' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                  'bg-gradient-to-r from-blue-500 to-cyan-500'
                }`}
              >
                {confirmModal.loading ? '⏳' : confirmModal.confirmText}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
