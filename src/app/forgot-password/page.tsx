'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !email.includes('@')) {
      setError('נא להזין כתובת מייל תקינה')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/managers/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(true)
      } else {
        // Even if email doesn't exist, we show success for security
        // (don't reveal which emails are in the system)
        setSuccess(true)
      }
    } catch (err) {
      console.error('Forgot password error:', err)
      setError('שגיאה בשליחת הבקשה. נסה שנית.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">📧</div>
            <h1 className="text-2xl font-bold text-green-600 mb-2">המייל נשלח בהצלחה!</h1>
            <p className="text-gray-600">
              אם המייל קיים במערכת, נשלח אליו קישור לאיפוס סיסמה.
            </p>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>שים לב:</strong> הקישור תקף לשעה אחת בלבד.
            </p>
            <p className="text-sm text-blue-800 mt-2">
              לא קיבלת מייל? בדוק את תיבת הספאם או נסה שוב בעוד מספר דקות.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => router.push('/login')}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              חזור להתחברות
            </Button>
            <Button
              onClick={() => {
                setSuccess(false)
                setEmail('')
              }}
              variant="outline"
              className="w-full border-2"
            >
              שלח קישור נוסף
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔑</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">שכחת סיסמא?</h1>
          <p className="text-gray-600">
            הזן את כתובת המייל שלך ונשלח לך קישור לאיפוס הסיסמה
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              כתובת מייל
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
              }}
              placeholder="your@email.com"
              required
              disabled={loading}
              className="h-12 text-lg"
              dir="ltr"
            />
            {error && (
              <p className="text-red-600 text-sm mt-2">{error}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-12 text-lg"
          >
            {loading ? 'שולח...' : '📨 שלח קישור לאיפוס סיסמה'}
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
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-600 text-center">
              <strong>טיפ:</strong> אם אין לך גישה למייל שלך, צור קשר עם מנהל המערכת.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
