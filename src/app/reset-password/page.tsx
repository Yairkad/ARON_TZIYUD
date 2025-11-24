'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [hasToken, setHasToken] = useState(false)

  // Check for token hash in URL (Supabase Auth sends #access_token=...)
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const type = hashParams.get('type')

    // Check if this is a password recovery link
    if (accessToken && type === 'recovery') {
      setHasToken(true)
    } else {
      setHasToken(false)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!newPassword || newPassword.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('הסיסמאות אינן תואמות')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Extract access_token from URL hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')

      if (!accessToken) {
        setError('טוקן איפוס חסר או לא תקין')
        setLoading(false)
        return
      }

      // Set the session with the recovery token
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: hashParams.get('refresh_token') || ''
      })

      if (sessionError) {
        console.error('Session error:', sessionError)
        setError('שגיאה באימות הטוקן')
        setLoading(false)
        return
      }

      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        console.error('Update error:', updateError)
        setError(updateError.message || 'שגיאה באיפוס הסיסמה')
        setLoading(false)
        return
      }

      // Sign out after password change (user will login with new password)
      await supabase.auth.signOut()

      setSuccess(true)
    } catch (err) {
      console.error('Reset password error:', err)
      setError('שגיאה בתקשורת עם השרת')
    } finally {
      setLoading(false)
    }
  }

  // No token provided
  if (!hasToken && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">קישור לא תקין</h1>
            <p className="text-gray-600">לא נמצא טוקן איפוס בקישור</p>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              אם קיבלת קישור איפוס סיסמה במייל, ודא שהעתקת את הקישור המלא.
            </p>

            <div className="space-y-3">
              <Button
                onClick={() => router.push('/forgot-password')}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                בקש קישור חדש
              </Button>
              <Button
                onClick={() => router.push('/login')}
                variant="outline"
                className="w-full border-2"
              >
                חזור לדף התחברות
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-green-600 mb-2">הסיסמה שונתה בהצלחה!</h1>
            <p className="text-gray-600">כעת תוכל להתחבר עם הסיסמה החדשה</p>
          </div>

          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-green-800 text-center">
              <strong>הצעד הבא:</strong> התחבר למערכת עם כתובת המייל והסיסמה החדשה שהגדרת.
            </p>
          </div>

          <Button
            onClick={() => router.push('/login')}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-lg py-6"
          >
            המשך להתחברות →
          </Button>
        </div>
      </div>
    )
  }

  // Reset password form
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">איפוס סיסמה</h1>
          <p className="text-gray-600">
            הגדר סיסמה חדשה לחשבון שלך
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
              סיסמה חדשה
            </label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value)
                setError('')
              }}
              placeholder="לפחות 6 תווים"
              required
              disabled={loading}
              className="h-12 text-lg"
              minLength={6}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              אימות סיסמה חדשה
            </label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                setError('')
              }}
              placeholder="הזן שוב את הסיסמה"
              required
              disabled={loading}
              className="h-12 text-lg"
            />
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-red-600 text-sm text-center">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-12 text-lg"
          >
            {loading ? 'משנה סיסמה...' : '🔑 שנה סיסמה'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/login')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← חזור להתחברות
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm text-blue-800 text-center">
              <strong>טיפ אבטחה:</strong> השתמש בסיסמה חזקה המכילה אותיות, מספרים ותווים מיוחדים.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
