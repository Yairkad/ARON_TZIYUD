'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ProfilePage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [manager, setManager] = useState<any>(null)

  // Form fields
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [emailChanged, setEmailChanged] = useState(false)

  // Load current manager data
  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/auth/me')
      const data = await response.json()

      if (!response.ok || !data.manager) {
        router.push('/login')
        return
      }

      setManager(data.manager)
      setName(data.manager.name)
      setPhone(data.manager.phone || '')
      setEmail(data.manager.email)
    } catch (err) {
      console.error('Error loading profile:', err)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setEmailChanged(false)

    // Validate name
    if (!name || name.trim().length === 0) {
      setError('נא להזין שם')
      return
    }

    // Validate phone if provided
    if (phone && !/^05\d{8}$/.test(phone.trim())) {
      setError('מספר טלפון חייב להיות בן 10 ספרות ולהתחיל ב-05')
      return
    }

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('כתובת מייל לא תקינה')
      return
    }

    // Validate password change if requested
    if (newPassword || confirmPassword) {
      if (!currentPassword) {
        setError('נא להזין את הסיסמה הנוכחית')
        return
      }
      if (newPassword.length < 6) {
        setError('הסיסמה החדשה חייבת להכיל לפחות 6 תווים')
        return
      }
      if (newPassword !== confirmPassword) {
        setError('הסיסמאות אינן תואמות')
        return
      }
    }

    setSaving(true)

    try {
      const updateData: any = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase()
      }

      // Add password data if changing password
      if (currentPassword && newPassword) {
        updateData.currentPassword = currentPassword
        updateData.newPassword = newPassword
      }

      const response = await fetch('/api/managers/update-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(data.message)
        setEmailChanged(data.emailChanged || false)

        // Clear password fields
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')

        // Reload profile to get updated data
        await loadProfile()

        // If email changed, show warning about verification
        if (data.emailChanged) {
          setTimeout(() => {
            setSuccess('המייל עודכן! נשלח אליך קישור אימות לכתובת החדשה. עליך לאמת את המייל כדי להמשיך להשתמש במערכת.')
          }, 500)
        }
      } else {
        setError(data.error || 'שגיאה בעדכון הפרופיל')
      }
    } catch (err) {
      console.error('Update profile error:', err)
      setError('שגיאה בתקשורת עם השרת')
    } finally {
      setSaving(false)
    }
  }

  const handleResendVerification = async () => {
    try {
      const response = await fetch('/api/managers/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess('קישור אימות נשלח מחדש למייל שלך!')
      } else {
        setError(data.error || 'שגיאה בשליחת קישור אימות')
      }
    } catch (err) {
      console.error('Resend verification error:', err)
      setError('שגיאה בתקשורת עם השרת')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-2xl mx-auto py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-800 text-2xl"
            >
              ←
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">⚙️ הגדרות פרופיל</h1>
              <p className="text-gray-600">עדכן את הפרטים האישיים שלך</p>
            </div>
          </div>

          {/* Email verification status */}
          {manager && !manager.email_verified && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <p className="font-semibold text-yellow-800 mb-1">המייל שלך טרם אומת</p>
                  <p className="text-sm text-yellow-700 mb-3">
                    נשלח אליך קישור אימות למייל. יש לאמת את המייל כדי להמשיך להשתמש במערכת.
                  </p>
                  <Button
                    onClick={handleResendVerification}
                    variant="outline"
                    size="sm"
                    className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                  >
                    📧 שלח קישור אימות מחדש
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6">
              <p className="text-green-800 text-center">{success}</p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
              <p className="text-red-600 text-center">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">פרטים בסיסיים</h2>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  שם מלא *
                </label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={saving}
                  className="h-12 text-lg"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  מספר טלפון
                </label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0501234567"
                  disabled={saving}
                  className="h-12 text-lg"
                  dir="ltr"
                />
                <p className="text-xs text-gray-500 mt-1">פורמט: 05XXXXXXXX (10 ספרות)</p>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  כתובת מייל *
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={saving}
                  className="h-12 text-lg"
                  dir="ltr"
                />
                {manager && email.toLowerCase() !== manager.email.toLowerCase() && (
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠️ שינוי המייל ידרוש אימות מחדש
                  </p>
                )}
              </div>
            </div>

            {/* Password Change Section */}
            <div className="space-y-4 pt-6 border-t">
              <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">שינוי סיסמה</h2>
              <p className="text-sm text-gray-600">השאר ריק אם אינך רוצה לשנות את הסיסמה</p>

              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  סיסמה נוכחית
                </label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={saving}
                  className="h-12 text-lg"
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  סיסמה חדשה
                </label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="לפחות 6 תווים"
                  disabled={saving}
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
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="הזן שוב את הסיסמה החדשה"
                  disabled={saving}
                  className="h-12 text-lg"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <Button
                type="submit"
                disabled={saving}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-12 text-lg"
              >
                {saving ? 'שומר שינויים...' : '💾 שמור שינויים'}
              </Button>
            </div>
          </form>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-sm text-blue-800 text-center">
            <strong>טיפ אבטחה:</strong> מומלץ להשתמש בסיסמה חזקה המכילה אותיות, מספרים ותווים מיוחדים.
          </p>
        </div>
      </div>
    </div>
  )
}
