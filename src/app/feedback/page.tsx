'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type FeedbackType = 'bug' | 'suggestion' | 'other'
type UserSource = 'volunteer' | 'city_admin' | 'super_admin' | 'unknown'

interface AttachedFile {
  name: string
  type: string
  size: number
  base64: string
}

export default function FeedbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [type, setType] = useState<FeedbackType>('bug')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [senderName, setSenderName] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [senderPhone, setSenderPhone] = useState('')
  const [cityName, setCityName] = useState('')
  const [attachments, setAttachments] = useState<AttachedFile[]>([])
  const [userSource, setUserSource] = useState<UserSource>('unknown')
  const [sourceCityName, setSourceCityName] = useState<string>('')

  // Detect user source from URL params
  useEffect(() => {
    const source = searchParams.get('source') as UserSource
    const city = searchParams.get('city')
    if (source) {
      setUserSource(source)
    }
    if (city) {
      setSourceCityName(city)
      setCityName(city)
    }
  }, [searchParams])

  const typeOptions = [
    { value: 'bug', label: 'דיווח על באג', emoji: '🐛', color: 'border-red-300 bg-red-50 text-red-800', selected: 'border-red-500 bg-red-100 ring-2 ring-red-500' },
    { value: 'suggestion', label: 'הצעת שיפור', emoji: '💡', color: 'border-blue-300 bg-blue-50 text-blue-800', selected: 'border-blue-500 bg-blue-100 ring-2 ring-blue-500' },
    { value: 'other', label: 'אחר', emoji: '📝', color: 'border-gray-300 bg-gray-50 text-gray-800', selected: 'border-gray-500 bg-gray-100 ring-2 ring-gray-500' },
  ]

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const maxSize = 25 * 1024 * 1024 // 25MB (Gmail limit)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']

    for (const file of Array.from(files)) {
      if (file.size > maxSize) {
        setError(`הקובץ ${file.name} גדול מדי. מקסימום 25MB`)
        continue
      }

      if (!allowedTypes.includes(file.type)) {
        setError(`סוג הקובץ ${file.name} לא נתמך. נתמכים: תמונות (JPG, PNG, GIF, WebP) וסרטונים (MP4, WebM)`)
        continue
      }

      // Convert to base64
      const base64 = await fileToBase64(file)
      setAttachments(prev => [...prev, {
        name: file.name,
        type: file.type,
        size: file.size,
        base64
      }])
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!subject.trim()) {
      setError('נא להזין נושא')
      return
    }

    if (!description.trim()) {
      setError('נא להזין תיאור')
      return
    }

    if (description.trim().length < 10) {
      setError('התיאור קצר מדי. נא לפרט יותר')
      return
    }

    setSending(true)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          subject: subject.trim(),
          description: description.trim(),
          senderName: senderName.trim() || undefined,
          senderEmail: senderEmail.trim() || undefined,
          senderPhone: senderPhone.trim() || undefined,
          cityName: cityName.trim() || undefined,
          attachments: attachments.length > 0 ? attachments : undefined,
          userSource,
          sourceCityName: sourceCityName || undefined,
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(true)
      } else {
        setError(data.error || 'שגיאה בשליחת הפידבק')
      }
    } catch (err) {
      console.error('Feedback error:', err)
      setError('שגיאה בתקשורת עם השרת')
    } finally {
      setSending(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">תודה על המשוב!</h1>
          <p className="text-gray-600 mb-6">
            הפידבק שלך נשלח בהצלחה. נבדוק אותו בהקדם.
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => {
                setSuccess(false)
                setSubject('')
                setDescription('')
                setAttachments([])
              }}
              variant="outline"
            >
              שלח עוד פידבק
            </Button>
            <Button
              onClick={() => router.back()}
              className="bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              חזרה למערכת
            </Button>
          </div>
        </div>
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
              <h1 className="text-3xl font-bold text-gray-900">📣 שליחת פידבק</h1>
              <p className="text-gray-600">דווח על באג או שלח הצעה לשיפור המערכת</p>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
              <p className="text-red-600 text-center">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                סוג הפידבק *
              </label>
              <div className="grid grid-cols-3 gap-3">
                {typeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setType(option.value as FeedbackType)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      type === option.value ? option.selected : option.color
                    } hover:scale-105`}
                  >
                    <div className="text-2xl mb-1">{option.emoji}</div>
                    <div className="text-sm font-medium">{option.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                נושא *
              </label>
              <Input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={type === 'bug' ? 'למשל: כפתור לא עובד בדף הבקשות' : 'למשל: הוספת אפשרות לסינון לפי תאריך'}
                required
                disabled={sending}
                className="h-12 text-lg"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                תיאור מפורט *
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={type === 'bug'
                  ? 'תאר את הבעיה בפירוט:\n- מה ניסית לעשות?\n- מה קרה בפועל?\n- מה ציפית שיקרה?'
                  : 'תאר את ההצעה שלך בפירוט:\n- מה היית רוצה שיתווסף?\n- איך זה יעזור לך?'}
                required
                disabled={sending}
                rows={6}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">מינימום 10 תווים</p>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                צילום/הקלטת מסך (אופציונלי)
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={sending}
                />
                <div className="text-4xl mb-2">📎</div>
                <p className="text-gray-600 font-medium">לחץ להעלאת קובץ</p>
                <p className="text-xs text-gray-500 mt-1">
                  תמונות (JPG, PNG, GIF) או סרטונים (MP4, WebM) - עד 25MB
                </p>
              </div>

              {/* Attached Files List */}
              {attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {file.type.startsWith('video/') ? '🎬' : '🖼️'}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{file.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                        disabled={sending}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Separator */}
            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">פרטי יצירת קשר (אופציונלי)</h2>
              <p className="text-sm text-gray-600 mb-4">
                השאר פרטים כדי שנוכל לחזור אליך עם עדכונים או שאלות הבהרה
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="senderName" className="block text-sm font-medium text-gray-700 mb-2">
                    שם
                  </label>
                  <Input
                    id="senderName"
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="השם שלך"
                    disabled={sending}
                    className="h-12"
                  />
                </div>

                <div>
                  <label htmlFor="cityName" className="block text-sm font-medium text-gray-700 mb-2">
                    עיר
                  </label>
                  <Input
                    id="cityName"
                    type="text"
                    value={cityName}
                    onChange={(e) => setCityName(e.target.value)}
                    placeholder="שם העיר שלך"
                    disabled={sending}
                    className="h-12"
                  />
                </div>

                <div>
                  <label htmlFor="senderEmail" className="block text-sm font-medium text-gray-700 mb-2">
                    מייל
                  </label>
                  <Input
                    id="senderEmail"
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="your@email.com"
                    disabled={sending}
                    className="h-12"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label htmlFor="senderPhone" className="block text-sm font-medium text-gray-700 mb-2">
                    טלפון
                  </label>
                  <Input
                    id="senderPhone"
                    type="tel"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    placeholder="0501234567"
                    disabled={sending}
                    className="h-12"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                disabled={sending}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-14 text-lg"
              >
                {sending ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    שולח...
                  </span>
                ) : (
                  '📤 שלח פידבק'
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-sm text-blue-800 text-center">
            <strong>💡 טיפ:</strong> ככל שתפרט יותר, נוכל לטפל בבעיה או להבין את ההצעה טוב יותר
          </p>
        </div>
      </div>
    </div>
  )
}
