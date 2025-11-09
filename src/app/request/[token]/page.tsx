'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EquipmentRequestWithItems } from '@/types'

export default function RequestPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [request, setRequest] = useState<EquipmentRequestWithItems | null>(null)

  useEffect(() => {
    verifyToken()
  }, [])

  const verifyToken = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/requests/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resolvedParams.token })
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.expired) {
          setError('הטוקן פג תוקף. אנא פנה למנהל העיר ליצירת טוקן חדש.')
        } else {
          setError(data.error || 'שגיאה באימות הטוקן')
        }
        return
      }

      setRequest(data.request)
    } catch (error) {
      console.error('Verify error:', error)
      setError('שגיאה בטעינת הבקשה')
    } finally {
      setLoading(false)
    }
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'ממתינה לאישור',
      approved: 'אושרה',
      rejected: 'נדחתה',
      cancelled: 'בוטלה',
      expired: 'פג תוקף'
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
      expired: 'bg-orange-100 text-orange-800'
    }
    return colorMap[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען בקשה...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="text-red-500 text-5xl mb-4">✗</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">שגיאה</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            חזרה לדף הבית
          </button>
        </div>
      </div>
    )
  }

  if (!request) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="text-center mb-6">
            <img
              src="/logo.png"
              alt="ARON"
              className="h-16 mx-auto mb-4"
            />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              בקשה לציוד
            </h1>
            <div className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(request.status)}`}>
              {getStatusText(request.status)}
            </div>
          </div>

          {/* Request Details */}
          <div className="border-t pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">שם מבקש</p>
                <p className="font-semibold text-gray-900">{request.requester_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">טלפון</p>
                <p className="font-semibold text-gray-900" dir="ltr">{request.requester_phone}</p>
              </div>
              {request.call_id && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">מזהה קריאה</p>
                  <p className="font-semibold text-gray-900">{request.call_id}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">תאריך בקשה</p>
                <p className="font-semibold text-gray-900">
                  {new Date(request.created_at).toLocaleDateString('he-IL')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">פג תוקף ב</p>
                <p className="font-semibold text-gray-900">
                  {new Date(request.expires_at).toLocaleString('he-IL')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Equipment Items */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">פריטי ציוד</h2>
          <div className="space-y-3">
            {request.items && request.items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-semibold text-gray-900">{item.equipment.name}</p>
                  {item.equipment.is_consumable && (
                    <p className="text-sm text-gray-600">ציוד מתכלה</p>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm text-gray-600">כמות</p>
                  <p className="font-bold text-blue-600">{item.quantity}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Approved Section */}
        {request.status === 'approved' && (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg shadow-lg p-6 mb-6">
            <div className="text-center mb-6">
              <div className="text-green-500 text-6xl mb-4">✓</div>
              <h2 className="text-2xl font-bold text-green-900 mb-2">
                הבקשה אושרה!
              </h2>
              <p className="text-green-800">
                אושר על ידי: {request.approved_by}
              </p>
            </div>

            {/* Cabinet Code */}
            {request.city?.cabinet_code && (
              <div className="bg-white rounded-lg p-6 mb-4">
                <h3 className="text-lg font-bold text-gray-900 mb-3 text-center">
                  קוד פתיחת ארון
                </h3>
                <div className="text-center">
                  <p className="text-4xl font-mono font-bold text-blue-600 tracking-wider">
                    {request.city.cabinet_code}
                  </p>
                </div>
              </div>
            )}

            {/* Location */}
            {request.city?.location_url && (
              <div className="text-center">
                <a
                  href={request.city.location_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
                >
                  פתח מיקום בגוגל מפות
                </a>
              </div>
            )}
          </div>
        )}

        {/* Rejected Section */}
        {request.status === 'rejected' && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg shadow-lg p-6 mb-6">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">✗</div>
              <h2 className="text-2xl font-bold text-red-900 mb-2">
                הבקשה נדחתה
              </h2>
              {request.rejected_reason && (
                <p className="text-red-800 mt-4">
                  <span className="font-semibold">סיבה: </span>
                  {request.rejected_reason}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Pending Section */}
        {request.status === 'pending' && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg shadow-lg p-6 mb-6">
            <div className="text-center">
              <div className="text-yellow-500 text-6xl mb-4">⏳</div>
              <h2 className="text-2xl font-bold text-yellow-900 mb-2">
                ממתינה לאישור מנהל
              </h2>
              <p className="text-yellow-800">
                הבקשה נשלחה בהצלחה ונמצאת בטיפול
              </p>
            </div>
          </div>
        )}

        {/* City Contact Info */}
        {request.city && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">פרטי התקשרות</h2>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">מנהל ראשי</p>
                <p className="font-semibold text-gray-900">{request.city.manager1_name}</p>
                <p className="text-gray-700" dir="ltr">{request.city.manager1_phone}</p>
              </div>
              {request.city.manager2_name && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-gray-600">מנהל משני</p>
                  <p className="font-semibold text-gray-900">{request.city.manager2_name}</p>
                  <p className="text-gray-700" dir="ltr">{request.city.manager2_phone}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
