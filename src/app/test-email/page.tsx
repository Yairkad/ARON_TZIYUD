'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function TestEmailPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      setResult({ type: 'error', message: 'אנא הזן כתובת מייל' })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          name: name || undefined,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setResult({
          type: 'success',
          message: `✅ המייל נשלח בהצלחה ל-${email}! בדוק את תיבת המייל שלך (גם בתיקיית spam).`,
        })
        setEmail('')
        setName('')
      } else {
        setResult({
          type: 'error',
          message: `❌ שגיאה: ${data.error || 'שליחת המייל נכשלה'}`,
        })
      }
    } catch (error) {
      console.error('Error:', error)
      setResult({
        type: 'error',
        message: `❌ שגיאת תקשורת: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="text-6xl mb-4">📧</div>
          <CardTitle className="text-3xl font-bold">בדיקת מערכת מיילים</CardTitle>
          <CardDescription className="text-base">
            ארון ציוד - מערכת שליחת מיילים
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                כתובת אימייל: <span className="text-red-500">*</span>
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@example.com"
                required
                disabled={loading}
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-gray-700">
                שם (אופציונלי):
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="השם שלך"
                disabled={loading}
                className="h-12 text-base"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-lg font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              {loading ? (
                <>
                  <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></span>
                  שולח...
                </>
              ) : (
                'שלח מייל בדיקה'
              )}
            </Button>
          </form>

          {result && (
            <Alert className={result.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
              <AlertDescription className={result.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                {result.message}
              </AlertDescription>
            </Alert>
          )}

          <div className="pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-3">הוראות שימוש:</h3>
            <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
              <li>הזן את כתובת המייל שלך</li>
              <li>הזן את השם שלך (אופציונלי)</li>
              <li>לחץ על &quot;שלח מייל בדיקה&quot;</li>
              <li>בדוק את תיבת המייל שלך (ייתכן בתיקיית spam)</li>
            </ol>
          </div>

          <div className="text-center text-xs text-gray-500 pt-4">
            דף זה מיועד לבדיקת תצורת המיילים בלבד
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
