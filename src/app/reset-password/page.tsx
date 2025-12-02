'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
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
  const [redirectTarget, setRedirectTarget] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [hasToken, setHasToken] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [tokenType, setTokenType] = useState<'supabase' | 'custom' | null>(null)
  const [customToken, setCustomToken] = useState<string | null>(null)
  const sessionHandled = useRef(false)

  // Check for tokens from URL - supports both Supabase Auth (#access_token) and custom (?token)
  useEffect(() => {
    let mounted = true

    const checkSession = async () => {
      // Check for custom token in query string (from email.ts sendPasswordResetEmail)
      const queryToken = searchParams.get('token')

      if (queryToken) {
        // Custom token system - used by send-reset-email API
        setTokenType('custom')
        setCustomToken(queryToken)
        setHasToken(true)
        if (mounted) setIsReady(true)
        return
      }

      // Check for Supabase Auth token in hash (#access_token)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const type = hashParams.get('type')

      if (accessToken && type === 'recovery') {
        setTokenType('supabase')
        // Wait for Supabase to auto-process the session from URL
        // detectSessionInUrl: true handles this automatically
        await new Promise(resolve => setTimeout(resolve, 500))

        if (!mounted) return

        // Check if session was set by detectSessionInUrl
        const { data: { session } } = await supabase.auth.getSession()

        if (session) {
          // Session already set by detectSessionInUrl, we're ready
          sessionHandled.current = true
          setHasToken(true)
        } else {
          // Session not set yet, try to set it manually
          setHasToken(true)
        }
      } else {
        setHasToken(false)
      }

      if (mounted) {
        setIsReady(true)
      }
    }

    checkSession()

    return () => {
      mounted = false
    }
  }, [searchParams])

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
      // Handle custom token (from email.ts sendPasswordResetEmail)
      if (tokenType === 'custom' && customToken) {
        const response = await fetch('/api/managers/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: customToken, newPassword })
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          setError(data.error || 'שגיאה באיפוס הסיסמה')
          setLoading(false)
          return
        }

        console.log('Password reset response:', data)
        console.log('User data:', data.user)

        // Auto-login with the new password if we have user email
        if (data.user?.email) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: data.user.email,
            password: newPassword
          })

          if (signInError) {
            console.error('Auto-login error:', signInError)
            // Fall back to login page if auto-login fails
            setSuccess(true)
            setRedirectTarget('/login')
            setTimeout(() => {
              window.location.href = '/login'
            }, 2000)
            return
          }

          // Store the access token in a cookie for server-side auth (with explicit expiry for PWA)
          if (signInData.session?.access_token) {
            const maxAge = 60 * 60 * 24 * 7 // 7 days
            const expiryDate = new Date(Date.now() + maxAge * 1000).toUTCString()
            document.cookie = `sb-access-token=${signInData.session.access_token}; path=/; max-age=${maxAge}; expires=${expiryDate}; SameSite=Lax`
            if (signInData.session.refresh_token) {
              document.cookie = `sb-refresh-token=${signInData.session.refresh_token}; path=/; max-age=${maxAge}; expires=${expiryDate}; SameSite=Lax`
            }
          }

          // Wait for session to be stored
          await new Promise(resolve => setTimeout(resolve, 300))
        }

        setSuccess(true)

        // Determine redirect based on user role
        if (data.user?.role === 'super_admin') {
          setRedirectTarget('/super-admin')
        } else if (data.user?.role === 'city_manager' && data.user?.city_id) {
          setRedirectTarget(`/city/${data.user.city_id}/admin`)
        } else {
          setRedirectTarget('/login')
        }

        // Redirect after 2 seconds
        setTimeout(() => {
          if (data.user?.role === 'super_admin') {
            window.location.href = '/super-admin'
          } else if (data.user?.role === 'city_manager' && data.user?.city_id) {
            window.location.href = `/city/${data.user.city_id}/admin`
          } else {
            window.location.href = '/login'
          }
        }, 2000)
        return
      }

      // Handle Supabase Auth token (from resetPasswordForEmail)
      // Only set session manually if it wasn't already handled by detectSessionInUrl
      if (!sessionHandled.current) {
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

      // Get session and user info to determine where to redirect
      const { data: { session } } = await supabase.auth.getSession()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Store the access token in a cookie for server-side auth
        if (session?.access_token) {
          const maxAge = 60 * 60 * 24 * 7 // 7 days
          const expiryDate = new Date(Date.now() + maxAge * 1000).toUTCString()
          document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${maxAge}; expires=${expiryDate}; SameSite=Lax`
          if (session.refresh_token) {
            document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=${maxAge}; expires=${expiryDate}; SameSite=Lax`
          }
        }

        // Wait for cookies to be stored
        await new Promise(resolve => setTimeout(resolve, 300))

        // Fetch user role and city_id from database
        const { data: userData } = await supabase
          .from('users')
          .select('role, city_id')
          .eq('id', user.id)
          .single()

        setSuccess(true)

        // Determine redirect based on user role
        if (userData?.role === 'super_admin') {
          setRedirectTarget('/super-admin')
        } else if (userData?.role === 'city_manager' && userData?.city_id) {
          setRedirectTarget(`/city/${userData.city_id}/admin`)
        } else {
          setRedirectTarget('/login')
        }

        // Redirect based on role after 2 seconds
        setTimeout(() => {
          if (userData?.role === 'super_admin') {
            window.location.href = '/super-admin'
          } else if (userData?.role === 'city_manager' && userData?.city_id) {
            window.location.href = `/city/${userData.city_id}/admin`
          } else {
            window.location.href = '/login'
          }
        }, 2000)
      } else {
        setSuccess(true)
        setRedirectTarget('/login')
      }
    } catch (err) {
      console.error('Reset password error:', err)
      setError('שגיאה בתקשורת עם השרת')
    } finally {
      setLoading(false)
    }
  }

  // Still checking for token - show loading
  if (!isReady) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    )
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
            <p className="text-gray-600">
              {redirectTarget === '/login' ? 'כעת תוכל להתחבר עם הסיסמה החדשה' : 'מעביר אותך לעמוד הניהול...'}
            </p>
          </div>

          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-green-800 text-center">
              <strong>
                {redirectTarget === '/login'
                  ? 'מעביר אותך לעמוד ההתחברות...'
                  : redirectTarget?.includes('/super-admin')
                    ? 'מעביר אותך לעמוד ניהול המערכת...'
                    : 'מעביר אותך לעמוד הניהול של העיר שלך...'}
              </strong>
            </p>
            <div className="flex justify-center mt-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          </div>
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
