'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EquipmentRequestWithItems } from '@/types'

interface RequestsTabProps {
  cityId: string
  cityName: string
  managerName: string
  onRequestsUpdate?: () => void
  canApprove: boolean
  canEdit: boolean
}

export default function RequestsTab({ cityId, cityName, managerName, onRequestsUpdate, canApprove, canEdit }: RequestsTabProps) {
  const [requests, setRequests] = useState<EquipmentRequestWithItems[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'expired' | 'picked_up'>('all')
  const [search, setSearch] = useState('')
  const [rejectReason, setRejectReason] = useState<{ requestId: string; reason: string } | null>(null)
  const [regeneratedToken, setRegeneratedToken] = useState<{ requestId: string; token: string } | null>(null)
  const [approvedRequest, setApprovedRequest] = useState<string | null>(null)
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set())
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [pollInterval, setPollInterval] = useState(30000) // Start with 30 seconds
  const [noChangeCount, setNoChangeCount] = useState(0)
  const [lastRequestCount, setLastRequestCount] = useState(0)

  useEffect(() => {
    fetchRequests()
    // Reset polling when city changes
    setPollInterval(30000)
    setNoChangeCount(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityId])

  // Smart auto-refresh with exponential backoff
  useEffect(() => {
    const interval = setInterval(() => {
      console.log(`🔄 Auto-refreshing requests... (interval: ${pollInterval / 1000}s)`)
      fetchRequests()
    }, pollInterval)

    return () => clearInterval(interval)
  }, [cityId, pollInterval])

  // Adjust polling interval based on activity
  useEffect(() => {
    const currentCount = requests.length
    const pendingCount = requests.filter(r => r.status === 'pending').length

    // If there are pending requests, keep polling frequently
    if (pendingCount > 0) {
      setPollInterval(30000) // 30 seconds
      setNoChangeCount(0)
      return
    }

    // If no changes in request count
    if (currentCount === lastRequestCount) {
      setNoChangeCount(prev => prev + 1)
      // Increase interval after no changes (max 5 minutes)
      if (noChangeCount >= 3) {
        setPollInterval(prev => Math.min(prev * 1.5, 300000))
      }
    } else {
      // Changes detected, reset to fast polling
      setPollInterval(30000)
      setNoChangeCount(0)
    }

    setLastRequestCount(currentCount)
  }, [requests, lastRequestCount, noChangeCount])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      console.log('📡 Fetching requests for cityId:', cityId)
      const response = await fetch(`/api/requests/manage?cityId=${cityId}`)
      const data = await response.json()

      console.log('📦 Received data:', data)
      console.log('📊 Number of requests:', data.requests?.length || 0)

      if (data.success) {
        setRequests(data.requests || [])
        setLastUpdated(new Date())
        console.log('✅ Requests set to state:', data.requests?.length || 0)
      } else {
        console.error('❌ API returned error:', data.error)
      }
    } catch (error) {
      console.error('Error fetching requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleManageRequest = async (requestId: string, action: 'approve' | 'reject' | 'cancel' | 'regenerate', rejectedReason?: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/requests/manage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          action,
          managerName,
          cityId,
          rejectedReason
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בעדכון בקשה')
      }

      if ((action === 'regenerate' || action === 'approve') && data.newToken) {
        setRegeneratedToken({ requestId, token: data.newToken })
      } else if (action === 'approve') {
        // Fallback if no token returned (shouldn't happen with new API)
        setApprovedRequest(requestId)
      } else {
        alert(getSuccessMessage(action))
      }

      setRejectReason(null)
      fetchRequests()
      onRequestsUpdate?.()
    } catch (error: any) {
      console.error('Error managing request:', error)
      alert(error.message || 'אירעה שגיאה בעדכון הבקשה')
    } finally {
      setLoading(false)
    }
  }

  const handleExtendToken = async (requestId: string, minutesToAdd: number) => {
    if (!confirm(`האם להאריך את תוקף הטוקן ב-${minutesToAdd} דקות?`)) return

    setLoading(true)
    try {
      const response = await fetch('/api/requests/extend-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          minutesToAdd,
          managerName
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בהארכת תוקף')
      }

      alert(data.message)
      fetchRequests()
      onRequestsUpdate?.()
    } catch (error: any) {
      console.error('Error extending token:', error)
      alert(error.message || 'אירעה שגיאה בהארכת התוקף')
    } finally {
      setLoading(false)
    }
  }

  const getSuccessMessage = (action: string) => {
    const messages: Record<string, string> = {
      approve: 'הבקשה אושרה בהצלחה!',
      reject: 'הבקשה נדחתה',
      cancel: 'הבקשה בוטלה',
      regenerate: 'טוקן חדש נוצר בהצלחה!'
    }
    return messages[action] || 'הפעולה בוצעה בהצלחה'
  }

  const getRequestUrl = (token: string) => {
    return `${window.location.origin}/request/${token}`
  }

  const handleWhatsAppShare = (request: EquipmentRequestWithItems, token: string) => {
    const url = getRequestUrl(token)

    const message = `שלום ${request.requester_name},

הבקשה שלך לציוד מארון ${cityName} ${getStatusText(request.status)}!

📋 סטטוס: ${getStatusText(request.status)}
📅 תאריך: ${new Date(request.created_at).toLocaleDateString('he-IL')}
${request.call_id ? `🆔 מזהה קריאה: ${request.call_id}\n` : ''}
🔗 לצפייה בפרטי הבקשה:
${url}

תודה!`

    // Don't auto-fill phone - let manager decide who to send to
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  const handleCopyLink = (token: string, request?: EquipmentRequestWithItems) => {
    const tokenUrl = getRequestUrl(token)

    // If request is provided, copy full message; otherwise just URL
    let textToCopy = tokenUrl

    if (request) {
      const equipmentList = request.items.map(item => `• ${item.equipment.name} - כמות: ${item.quantity}`).join('\n')
      const locationUrl = request.city?.token_location_url || request.city?.location_url || ''

      textToCopy = `שלום ${request.requester_name},

✅ הבקשה שלך אושרה!

📦 ציוד:
${equipmentList}

🔗 לחץ כאן לפרטים מלאים וקוד הארון:
${tokenUrl}
${locationUrl ? `\n📍 מיקום הארון:\n${locationUrl}` : ''}

💚 בהצלחה!`
    }

    navigator.clipboard.writeText(textToCopy)
    alert(request ? '✅ ההודעה המלאה הועתקה ללוח!' : '✅ הקישור הועתק ללוח!')
  }

  const toggleExpanded = (requestId: string) => {
    const newExpanded = new Set(expandedRequests)
    if (newExpanded.has(requestId)) {
      newExpanded.delete(requestId)
    } else {
      newExpanded.add(requestId)
    }
    setExpandedRequests(newExpanded)
  }

  const handleSendApprovalWhatsApp = (request: EquipmentRequestWithItems) => {
    const phone = request.requester_phone.replace(/\D/g, '')
    const internationalPhone = phone.startsWith('0') ? '972' + phone.slice(1) : phone
    const tokenUrl = getRequestUrl(request.token)

    // Build equipment list
    const equipmentList = request.items.map(item => `• ${item.equipment.name} - כמות: ${item.quantity}`).join('\n')

    // Build location URL if available
    const locationUrl = request.city?.token_location_url || request.city?.location_url || ''

    const message = `שלום ${request.requester_name},

✅ הבקשה שלך אושרה!

📦 ציוד:
${equipmentList}

🔗 לחץ כאן לפרטים מלאים וקוד הארון:
${tokenUrl}
${locationUrl ? `\n📍 מיקום הארון:\n${locationUrl}` : ''}

💚 בהצלחה!`

    const whatsappUrl = `https://wa.me/${internationalPhone}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      approved: 'bg-green-100 text-green-800 border-green-300',
      rejected: 'bg-red-100 text-red-800 border-red-300',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-300',
      expired: 'bg-orange-100 text-orange-800 border-orange-300',
      picked_up: 'bg-blue-100 text-blue-800 border-blue-300'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: 'ממתינה',
      approved: 'אושרה',
      rejected: 'נדחתה',
      cancelled: 'בוטלה',
      expired: 'פג תוקף',
      picked_up: 'נאסף'
    }
    return texts[status] || status
  }

  // Memoize filtered requests to avoid recalculation on every render
  const filteredRequests = useMemo(() => {
    return requests
      .filter(req => filter === 'all' || req.status === filter)
      .filter(req =>
        search === '' ||
        req.requester_name.toLowerCase().includes(search.toLowerCase()) ||
        req.requester_phone.includes(search) ||
        (req.call_id && req.call_id.includes(search))
      )
  }, [requests, filter, search])

  if (loading && requests.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">טוען בקשות...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex-1">
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 חפש לפי שם, טלפון או מזהה קריאה..."
              className="h-12 border-2 border-gray-200 rounded-xl"
            />
          </div>
          {lastUpdated && (
            <div className="text-xs text-gray-500 whitespace-nowrap flex items-center gap-1">
              <span className="animate-pulse">🔄</span>
              <span>עדכון אחרון: {lastUpdated.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'הכל', count: requests.length },
            { value: 'pending', label: 'ממתינות', count: requests.filter(r => r.status === 'pending').length },
            { value: 'approved', label: 'מאושרות', count: requests.filter(r => r.status === 'approved').length },
            { value: 'picked_up', label: 'נאספו', count: requests.filter(r => r.status === 'picked_up').length },
            { value: 'rejected', label: 'נדחו', count: requests.filter(r => r.status === 'rejected').length },
            { value: 'expired', label: 'פג תוקף', count: requests.filter(r => r.status === 'expired').length }
          ].map(({ value, label, count }) => (
            <Button
              key={value}
              onClick={() => setFilter(value as any)}
              variant={filter === value ? 'default' : 'outline'}
              className={`${
                filter === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } rounded-lg px-4 py-2`}
            >
              {label} ({count})
            </Button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">אין בקשות</h3>
          <p className="text-gray-600">
            {search ? 'לא נמצאו בקשות התואמות את החיפוש' : 'עדיין לא התקבלו בקשות לציוד'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map(request => {
            const isExpanded = expandedRequests.has(request.id)
            return (
              <div key={request.id} className="bg-white rounded-xl shadow-md border-2 border-gray-200 overflow-hidden transition-all">
                {/* Compact Header - Always Visible */}
                <div
                  onClick={() => toggleExpanded(request.id)}
                  className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`px-2 py-1 rounded-full text-xs font-semibold border-2 flex-shrink-0 ${getStatusColor(request.status)}`}>
                        {getStatusText(request.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{request.requester_name}</p>
                        <p className="text-xs text-gray-600 truncate">{request.items?.length || 0} פריטים • {new Date(request.created_at).toLocaleDateString('he-IL')}</p>
                      </div>
                    </div>
                    <button className="text-gray-600 hover:text-gray-900 transition-transform duration-200 flex-shrink-0" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      ▼
                    </button>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="p-4 space-y-4 border-t-2 border-gray-200">
                {/* Requester Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">👤 שם מבקש</p>
                    <p className="font-semibold text-gray-900">{request.requester_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">📱 טלפון</p>
                    <p className="font-semibold text-gray-900" dir="ltr">{request.requester_phone}</p>
                  </div>
                  {request.call_id && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">🆔 מזהה קריאה</p>
                      <p className="font-semibold text-gray-900">{request.call_id}</p>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">🎒 פריטים מבוקשים:</p>
                  <div className="space-y-2">
                    {request.items && request.items.map(item => (
                      <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-800">{item.equipment.name}</p>
                          {item.equipment.is_consumable && (
                            <p className="text-xs text-purple-600">🔄 ציוד מתכלה</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">כמות</p>
                          <p className="font-bold text-blue-600">{item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Approval Info */}
                {(request.status === 'approved' || request.status === 'picked_up') && request.approved_by && (
                  <div className={`${request.status === 'picked_up' ? 'bg-blue-50 border-2 border-blue-200' : 'bg-green-50 border-2 border-green-200'} rounded-lg p-4`}>
                    <p className={`text-sm ${request.status === 'picked_up' ? 'text-blue-800' : 'text-green-800'}`}>
                      ✅ <span className="font-semibold">אושר על ידי:</span> {request.approved_by}
                      {request.approved_at && ` ב-${new Date(request.approved_at).toLocaleString('he-IL')}`}
                    </p>
                  </div>
                )}

                {/* Rejection Info */}
                {request.status === 'rejected' && request.rejected_reason && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800">
                      <span className="font-semibold">סיבת דחייה:</span> {request.rejected_reason}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-4 border-t-2 border-gray-200">
                  {request.status === 'pending' && (
                    <>
                      <Button
                        onClick={() => {
                          if (!canApprove) {
                            alert('אין לך הרשאה לאשר בקשות - נדרשת הרשאת אישור בקשות')
                            return
                          }
                          handleManageRequest(request.id, 'approve')
                        }}
                        disabled={loading || !canApprove}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ✅ אשר בקשה
                      </Button>
                      <Button
                        onClick={() => {
                          if (!canApprove) {
                            alert('אין לך הרשאה לדחות בקשות - נדרשת הרשאת אישור בקשות')
                            return
                          }
                          setRejectReason({ requestId: request.id, reason: '' })
                        }}
                        disabled={loading || !canApprove}
                        className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ❌ דחה בקשה
                      </Button>
                    </>
                  )}

                  {request.status === 'approved' && new Date(request.expires_at) > new Date() && (
                    <>
                      <Button
                        onClick={() => {
                          if (!canApprove) {
                            alert('אין לך הרשאה להאריך טוקנים - נדרשת הרשאת אישור בקשות')
                            return
                          }
                          handleExtendToken(request.id, 10)
                        }}
                        disabled={loading || !canApprove}
                        className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-semibold rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ⏱️ +10 דק'
                      </Button>
                      <Button
                        onClick={() => {
                          if (!canApprove) {
                            alert('אין לך הרשאה להאריך טוקנים - נדרשת הרשאת אישור בקשות')
                            return
                          }
                          handleExtendToken(request.id, 20)
                        }}
                        disabled={loading || !canApprove}
                        className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-semibold rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ⏱️ +20 דק'
                      </Button>
                      <Button
                        onClick={() => {
                          if (!canApprove) {
                            alert('אין לך הרשאה להאריך טוקנים - נדרשת הרשאת אישור בקשות')
                            return
                          }
                          handleExtendToken(request.id, 30)
                        }}
                        disabled={loading || !canApprove}
                        className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-semibold rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ⏱️ +30 דק'
                      </Button>
                      <Button
                        onClick={() => {
                          if (!canApprove) {
                            alert('אין לך הרשאה להאריך טוקנים - נדרשת הרשאת אישור בקשות')
                            return
                          }
                          handleExtendToken(request.id, 60)
                        }}
                        disabled={loading || !canApprove}
                        className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-semibold rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ⏱️ +60 דק'
                      </Button>
                    </>
                  )}

                  {(request.status === 'expired' || request.status === 'approved') && (
                    <Button
                      onClick={() => {
                        if (!canApprove) {
                          alert('אין לך הרשאה ליצור טוקן חדש - נדרשת הרשאת אישור בקשות')
                          return
                        }
                        handleManageRequest(request.id, 'regenerate')
                      }}
                      disabled={loading || !canApprove}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      🔄 צור טוקן חדש
                    </Button>
                  )}

                  {(request.status === 'pending' || request.status === 'approved') && (
                    <Button
                      onClick={() => {
                        if (!canApprove) {
                          alert('אין לך הרשאה לבטל בקשות - נדרשת הרשאת אישור בקשות')
                          return
                        }
                        handleManageRequest(request.id, 'cancel')
                      }}
                      disabled={loading || !canApprove}
                      variant="outline"
                      className="border-2 border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      🚫 בטל בקשה
                    </Button>
                  )}
                </div>

              {/* Reject Dialog */}
              {rejectReason && rejectReason.requestId === request.id && (
                <div className="bg-red-50 border-t-2 border-red-200 p-6">
                  <h4 className="font-bold text-gray-900 mb-3">סיבת דחייה</h4>
                  <Input
                    type="text"
                    value={rejectReason.reason}
                    onChange={(e) => setRejectReason({ ...rejectReason, reason: e.target.value })}
                    placeholder="הזן סיבה לדחייה (אופציונלי)"
                    className="mb-3 h-12 border-2 border-gray-300 rounded-xl"
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleManageRequest(request.id, 'reject', rejectReason.reason || undefined)}
                      disabled={loading}
                      className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                    >
                      אשר דחייה
                    </Button>
                    <Button
                      onClick={() => setRejectReason(null)}
                      variant="outline"
                      className="border-2 border-gray-300 rounded-xl"
                    >
                      ביטול
                    </Button>
                  </div>
                </div>
              )}

              {/* Approved Request - Send WhatsApp */}
              {approvedRequest === request.id && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-t-2 border-green-200 p-6">
                  <div className="text-center mb-4">
                    <div className="text-4xl mb-2">✅</div>
                    <h4 className="font-bold text-gray-900 text-xl mb-2">הבקשה אושרה בהצלחה!</h4>
                    <p className="text-sm text-gray-600 mb-4">שלח הודעת אישור למבקש ב-WhatsApp</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={() => {
                        handleSendApprovalWhatsApp(request)
                        setApprovedRequest(null)
                      }}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-md"
                    >
                      <span className="text-xl mr-2">📱</span>
                      שלח אישור ב-WhatsApp
                    </Button>
                    <Button
                      onClick={() => handleCopyLink(request.token, request)}
                      variant="outline"
                      className="border-2 border-blue-400 text-blue-700 hover:bg-blue-50 rounded-xl"
                    >
                      📋 העתק הודעה
                    </Button>
                    <Button
                      onClick={() => setApprovedRequest(null)}
                      variant="outline"
                      className="border-2 border-gray-300 rounded-xl"
                    >
                      דלג
                    </Button>
                  </div>
                </div>
              )}

              {/* Regenerated Token Display */}
              {regeneratedToken && regeneratedToken.requestId === request.id && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-t-2 border-green-200 p-6">
                  <div className="text-center mb-4">
                    <div className="text-4xl mb-2">🎉</div>
                    <h4 className="font-bold text-gray-900 text-xl mb-2">טוקן חדש נוצר בהצלחה!</h4>
                    <p className="text-sm text-gray-600 mb-4">העתק את הקישור או פתח WhatsApp כדי לשלוח למבקש</p>
                  </div>

                  <div className="bg-white border-2 border-green-300 rounded-xl p-4 mb-4">
                    <p className="text-xs text-gray-500 mb-1">קישור לבקשה:</p>
                    <p className="font-mono text-sm text-blue-600 break-all">
                      {getRequestUrl(regeneratedToken.token)}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={() => handleWhatsAppShare(request, regeneratedToken.token)}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-md"
                    >
                      <span className="text-xl mr-2">📱</span>
                      שלח ב-WhatsApp
                    </Button>
                    <Button
                      onClick={() => handleCopyLink(regeneratedToken.token)}
                      variant="outline"
                      className="flex-1 border-2 border-green-500 text-green-700 hover:bg-green-50 rounded-xl font-semibold"
                    >
                      <span className="text-xl mr-2">📋</span>
                      העתק קישור
                    </Button>
                    <Button
                      onClick={() => setRegeneratedToken(null)}
                      variant="outline"
                      className="border-2 border-gray-300 rounded-xl"
                    >
                      סגור
                    </Button>
                  </div>
                </div>
              )}
                </div>
              )}
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
