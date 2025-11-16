'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EquipmentRequestWithItems } from '@/types'
import { Button } from '@/components/ui/button'
import { Phone, MessageCircle } from 'lucide-react'

export default function RequestPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [request, setRequest] = useState<EquipmentRequestWithItems | null>(null)
  const [confirmingPickup, setConfirmingPickup] = useState(false)
  const [pickupConfirmed, setPickupConfirmed] = useState(false)

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`
  }

  const handleWhatsApp = (phone: string) => {
    // Remove any non-digit characters and ensure Israeli format
    const formattedPhone = phone.replace(/\D/g, '').replace(/^0/, '972')
    window.open(`https://wa.me/${formattedPhone}`, '_blank')
  }

  useEffect(() => {
    verifyToken()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-refresh every 10 seconds when status is pending (but not if pickup confirmed)
  useEffect(() => {
    if (request?.status === 'pending' && !pickupConfirmed) {
      const interval = setInterval(() => {
        verifyToken()
      }, 10000)

      return () => clearInterval(interval)
    }
  }, [request?.status, pickupConfirmed])

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
      expired: 'פג תוקף',
      picked_up: 'הציוד נלקח'
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
      expired: 'bg-orange-100 text-orange-800',
      picked_up: 'bg-blue-100 text-blue-800'
    }
    return colorMap[status] || 'bg-gray-100 text-gray-800'
  }

  const handleConfirmPickup = async () => {
    if (!confirm('האם אתה בטוח שלקחת את הציוד? פעולה זו תעדכן את המלאי ותיצור רשומת השאלה.')) {
      return
    }

    setConfirmingPickup(true)
    setPickupConfirmed(true) // Mark as confirmed to prevent auto-refresh

    try {
      const response = await fetch('/api/requests/confirm-pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resolvedParams.token })
      })

      const data = await response.json()

      if (!response.ok) {
        alert(`שגיאה: ${data.error}`)
        setConfirmingPickup(false)
        setPickupConfirmed(false)
        return
      }

      // Success - redirect directly to return tab WITHOUT showing alert
      // Just redirect immediately
      router.push(`/city/${data.city_id}?tab=return`)
    } catch (error) {
      console.error('Confirm pickup error:', error)
      alert('שגיאה באישור לקיחת הציוד')
      setConfirmingPickup(false)
      setPickupConfirmed(false)
    }
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
              {request.approved_by && request.approved_at && (
                <>
                  <div>
                    <p className="text-sm text-gray-600">אושר על ידי</p>
                    <p className="font-semibold text-green-700">{request.approved_by}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">תאריך ושעת אישור</p>
                    <p className="font-semibold text-green-700">
                      {new Date(request.approved_at).toLocaleString('he-IL', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </>
              )}
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
            {confirmingPickup ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  מעדכן מלאי ומעבר לעמוד החזרה...
                </h2>
                <p className="text-gray-600">
                  אנא המתן
                </p>
              </div>
            ) : (
              <>
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

                {/* Location Image */}
                {request.city?.location_image && (
                  <div className="bg-white rounded-lg p-6 mb-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-3 text-center">
                      📸 תמונת הארון
                    </h3>
                    <img
                      src={request.city.location_image}
                      alt="מיקום הארון"
                      className="w-full max-w-2xl mx-auto rounded-lg shadow-md border-2 border-gray-200"
                    />
                  </div>
                )}

                {/* Location Description */}
                {request.city?.location_description && (
                  <div className="bg-white rounded-lg p-6 mb-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-3 text-center">
                      📝 הוראות מציאת הארון
                    </h3>
                    <p className="text-gray-700 whitespace-pre-wrap text-center leading-relaxed">
                      {request.city.location_description}
                    </p>
                  </div>
                )}

                {/* Location Navigation Buttons */}
                {(request.city?.token_location_url || request.city?.location_url) && (() => {
                  const locationUrl = request.city.token_location_url || request.city.location_url || ''

                  // Use coordinates from DB - prefer token coords, fall back to main coords
                  const lat = request.city.token_lat || request.city.lat
                  const lng = request.city.token_lng || request.city.lng

                  const googleMapsUrl = lat && lng
                    ? `https://www.google.com/maps?q=${lat},${lng}`
                    : locationUrl

                  const wazeUrl = lat && lng
                    ? `https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes&zoom=17`
                    : locationUrl

                  return (
                    <div className="bg-white rounded-lg p-6 mb-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
                        🗺️ ניווט לארון
                      </h3>
                      <div className="flex justify-center gap-3">
                        <a
                          href={googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-md"
                        >
                          📍 Google Maps
                        </a>
                        <a
                          href={wazeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-md"
                        >
                          🚗 Waze
                        </a>
                      </div>
                    </div>
                  )
                })()}

                {/* Confirm Pickup Button */}
                <div className="bg-white rounded-lg p-6 mt-6 border-2 border-blue-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 text-center">
                    ⚠️ חשוב - אישור לקיחת ציוד
                  </h3>
                  <p className="text-gray-700 text-center mb-4">
                    לאחר שלקחת את הציוד מהארון, אנא לחץ על הכפתור למטה
                  </p>
                  <button
                    onClick={handleConfirmPickup}
                    disabled={confirmingPickup}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 px-6 rounded-lg font-bold text-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                  >
                    {confirmingPickup ? '⏳ מאשר לקיחה...' : '✓ אישור - לקחתי את הציוד'}
                  </button>
                  <p className="text-sm text-gray-600 text-center mt-3">
                    פעולה זו תעדכן את המלאי ותאפשר החזרה בעתיד
                  </p>
                </div>
              </>
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

        {/* Picked Up Section */}
        {request.status === 'picked_up' && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg shadow-lg p-6 mb-6">
            <div className="text-center">
              <div className="text-blue-500 text-6xl mb-4">✓</div>
              <h2 className="text-2xl font-bold text-blue-900 mb-2">
                הציוד נלקח בהצלחה
              </h2>
              <p className="text-blue-800 mb-4">
                המלאי עודכן ונוצרה רשומת השאלה
              </p>
              <Button
                onClick={() => router.push(`/city/${request.city_id}?tab=return`)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
              >
                לדף החזרת ציוד
              </Button>
            </div>
          </div>
        )}

        {/* City Contact Info */}
        {request.city && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">📞 פרטי התקשרות</h2>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">מנהל ראשי</p>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👤</span>
                    <span className="font-semibold text-gray-900">{request.city.manager1_name}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => request.city && handleWhatsApp(request.city.manager1_phone)}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white h-12 rounded-lg font-semibold text-base"
                  >
                    <MessageCircle className="h-5 w-5 ml-2 text-white" />
                    WhatsApp
                  </Button>
                  <Button
                    onClick={() => request.city && handleCall(request.city.manager1_phone)}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white h-12 rounded-lg font-semibold text-base"
                  >
                    <Phone className="h-5 w-5 ml-2 text-white" />
                    חייג
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mt-2 text-center" dir="ltr">{request.city.manager1_phone}</p>
              </div>
              {request.city.manager2_name && request.city.manager2_phone && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">מנהל משני</p>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">👤</span>
                      <span className="font-semibold text-gray-900">{request.city.manager2_name}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => request.city?.manager2_phone && handleWhatsApp(request.city.manager2_phone)}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white h-12 rounded-lg font-semibold text-base"
                    >
                      <MessageCircle className="h-5 w-5 ml-2 text-white" />
                      WhatsApp
                    </Button>
                    <Button
                      onClick={() => request.city?.manager2_phone && handleCall(request.city.manager2_phone)}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white h-12 rounded-lg font-semibold text-base"
                    >
                      <Phone className="h-5 w-5 ml-2 text-white" />
                      חייג
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 text-center" dir="ltr">{request.city.manager2_phone}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
