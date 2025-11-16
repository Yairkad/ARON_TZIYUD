'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (token) {
      verifyEmail(token)
    }
  }, [token])

  const verifyEmail = async (verificationToken: string) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/managers/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationToken })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(true)
      } else {
        setError(data.error || 'שגיאה באימות המייל')
      }
    } catch (err) {
      console.error('Verification error:', err)
      setError('שגיאה בתקשורת עם השרת')
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!resendEmail || !resendEmail.includes('@')) {
      alert('נא להזין כתובת מייל תקינה')
      return
    }

    setResending(true)

    try {
      const response = await fetch(`/api/managers/verify-email?email=${encodeURIComponent(resendEmail)}`)
      const data = await response.json()

      if (response.ok && data.success) {
        alert('✅ מייל אימות נשלח בהצלחה! בדוק את תיבת הדואר שלך.')
        setResendEmail('')
      } else {
        alert('❌ ' + (data.error || 'שגיאה בשליחת מייל'))
      }
    } catch (err) {
      console.error('Resend error:', err)
      alert('❌ שגיאה בשליחת מייל אימות')
    } finally {
      setResending(false)
    }
  }

  // No token provided
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">קישור לא תקין</h1>
            <p className="text-gray-600">לא נמצא טוקן אימות בקישור</p>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              אם קיבלת קישור אימות במייל, ודא שהעתקת את הקישור המלא.
            </p>

            <Button
              onClick={() => router.push('/login')}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              חזור לדף התחברות
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">מאמת מייל...</h1>
            <p className="text-gray-600">אנא המתן</p>
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
            <h1 className="text-2xl font-bold text-green-600 mb-2">המייל אומת בהצלחה!</h1>
            <p className="text-gray-600">החשבון שלך פעיל וכעת תוכל להתחבר למערכת</p>
          </div>

          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-green-800 text-center">
              <strong>הצעד הבא:</strong> התחבר למערכת עם כתובת המייל והסיסמה הזמנית ששלחנו אליך במייל.
            </p>
            <p className="text-sm text-green-800 text-center mt-2">
              <strong>מומלץ בחום</strong> להחליף את הסיסמה הזמנית לסיסמה אישית מיד לאחר ההתחברות הראשונה!
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

  // Error state
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">אימות נכשל</h1>
          <p className="text-gray-700 font-medium">{error}</p>
        </div>

        {error.includes('פג תוקף') && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
            <h3 className="font-bold text-gray-900 mb-4 text-center">שלח מייל אימות מחדש</h3>
            <form onSubmit={handleResendVerification} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  כתובת מייל
                </label>
                <Input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="h-12 text-lg"
                  dir="ltr"
                />
              </div>
              <Button
                type="submit"
                disabled={resending}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {resending ? 'שולח...' : '📧 שלח מייל אימות'}
              </Button>
            </form>
          </div>
        )}

        <div className="space-y-3">
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
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
