'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { Equipment, BorrowHistory, BorrowForm, ReturnForm, City, CreateRequestForm } from '@/types'
import Logo from '@/components/Logo'

export default function CityPage() {
  const params = useParams()
  const cityId = params.cityId as string

  const [city, setCity] = useState<City | null>(null)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [borrowHistory, setBorrowHistory] = useState<BorrowHistory[]>([])
  const [activeTab, setActiveTab] = useState<'borrow' | 'return'>('borrow')
  const [borrowForm, setBorrowForm] = useState<BorrowForm>({ name: '', phone: '', equipment_id: '' })
  const [returnForm, setReturnForm] = useState<ReturnForm>({ phone: '' })
  const [userBorrows, setUserBorrows] = useState<BorrowHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [equipmentSearch, setEquipmentSearch] = useState('')
  const [showEquipmentDropdown, setShowEquipmentDropdown] = useState(false)

  // Request mode state
  const [requestForm, setRequestForm] = useState<CreateRequestForm>({
    requester_name: '',
    requester_phone: '',
    call_id: '',
    items: []
  })
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({})
  const [createdToken, setCreatedToken] = useState<string>('')
  const [requestCreated, setRequestCreated] = useState(false)

  // Return status selection
  const [returnStatus, setReturnStatus] = useState<{ borrowId: string; equipmentId: string } | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<'working' | 'faulty'>('working')
  const [faultyNotes, setFaultyNotes] = useState('')

  useEffect(() => {
    if (cityId) {
      fetchCity()
      fetchEquipment()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityId])

  const fetchCity = async () => {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('id', cityId)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching city:', error)
    } else {
      setCity(data)
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.equipment-search-container')) {
        setShowEquipmentDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchEquipment = async () => {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('city_id', cityId)
      .order('name')

    if (error) {
      console.error('Error fetching equipment:', error)
    } else {
      setEquipment(data || [])
    }
  }

  // === DIRECT MODE FUNCTIONS ===

  const handleBorrow = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!borrowForm.name || !borrowForm.phone || !borrowForm.equipment_id) {
      alert('אנא מלא את כל השדות')
      return
    }

    // Validate name (at least 2 words)
    const nameParts = borrowForm.name.trim().split(/\s+/)
    if (nameParts.length < 2) {
      alert('יש להזין שם ושם משפחה (לפחות 2 מילים)')
      return
    }

    // Validate phone (exactly 10 digits, starts with 05)
    const phoneDigits = borrowForm.phone.replace(/\D/g, '')
    if (phoneDigits.length !== 10 || !phoneDigits.startsWith('05')) {
      alert('מספר טלפון חייב להיות 10 ספרות ולהתחיל ב-05')
      return
    }

    setLoading(true)
    const selectedEquipment = equipment.find(eq => eq.id === borrowForm.equipment_id)

    if (!selectedEquipment || selectedEquipment.quantity <= 0) {
      alert('הציוד הנבחר אינו זמין')
      setLoading(false)
      return
    }

    if (selectedEquipment.equipment_status === 'faulty') {
      alert('לא ניתן להשאיל ציוד תקול. אנא בחר ציוד אחר או פנה למנהל העיר.')
      setLoading(false)
      return
    }

    try {
      const isConsumable = selectedEquipment.is_consumable
      const borrowStatus = isConsumable ? 'returned' : 'borrowed'
      const returnDate = isConsumable ? new Date().toISOString() : null

      const { data: borrowData, error: borrowError } = await supabase
        .from('borrow_history')
        .insert({
          name: borrowForm.name,
          phone: borrowForm.phone,
          equipment_id: borrowForm.equipment_id,
          equipment_name: selectedEquipment.name,
          city_id: cityId,
          status: borrowStatus,
          return_date: returnDate
        })
        .select()
        .single()

      if (borrowError) throw borrowError

      const { error: updateError } = await supabase
        .from('equipment')
        .update({ quantity: selectedEquipment.quantity - 1 })
        .eq('id', borrowForm.equipment_id)

      if (updateError) throw updateError

      if (isConsumable) {
        alert('יחידה אחת של הציוד המתכלה נרשמה בהצלחה! (לא דורש החזרה)\n💡 שים לב: רק יחידה בודדת הורדה מהמלאי, לא כל המארז.')
      } else {
        alert('הציוד הושאל בהצלחה!')
      }
      setBorrowForm({ name: '', phone: '', equipment_id: '' })
      setEquipmentSearch('')
      fetchEquipment()
    } catch (error) {
      console.error('Error borrowing equipment:', error)
      alert('אירעה שגיאה בהשאלת הציוד')
    } finally {
      setLoading(false)
    }
  }

  const handleReturnSearch = async () => {
    if (!returnForm.phone) {
      setUserBorrows([])
      return
    }

    const { data, error } = await supabase
      .from('borrow_history')
      .select('*')
      .eq('phone', returnForm.phone)
      .eq('city_id', cityId)
      .eq('status', 'borrowed')
      .order('borrow_date', { ascending: false })

    if (error) {
      console.error('Error fetching user borrows:', error)
    } else {
      setUserBorrows(data || [])
    }
  }

  const handleReturn = async (borrowId: string, equipmentId: string, equipmentStatus: 'working' | 'faulty' = 'working') => {
    // Validate that if status is faulty, notes must be provided
    if (equipmentStatus === 'faulty' && !faultyNotes.trim()) {
      alert('יש לפרט מה קרה לציוד התקול')
      return
    }

    setLoading(true)

    try {
      const updateData: any = {
        status: 'returned',
        return_date: new Date().toISOString(),
        equipment_status: equipmentStatus
      }

      // Add notes if equipment is faulty
      if (equipmentStatus === 'faulty') {
        updateData.faulty_notes = faultyNotes.trim()
      }

      const { error: updateError } = await supabase
        .from('borrow_history')
        .update(updateData)
        .eq('id', borrowId)

      if (updateError) throw updateError

      const equipmentItem = equipment.find(eq => eq.id === equipmentId)
      if (equipmentItem) {
        // Update quantity and status
        const { error: qtyUpdateError } = await supabase
          .from('equipment')
          .update({
            quantity: equipmentItem.quantity + 1,
            equipment_status: equipmentStatus
          })
          .eq('id', equipmentId)

        if (qtyUpdateError) throw qtyUpdateError
      }

      alert(equipmentStatus === 'working' ? 'הציוד הוחזר בהצלחה!' : 'הציוד הוחזר ומסומן כתקול')
      setReturnStatus(null)
      setSelectedStatus('working')
      setFaultyNotes('')
      handleReturnSearch()
      fetchEquipment()
    } catch (error) {
      console.error('Error returning equipment:', error)
      alert('אירעה שגיאה בהחזרת הציוד')
    } finally {
      setLoading(false)
    }
  }

  // === REQUEST MODE FUNCTIONS ===

  const handleItemToggle = (equipmentId: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(equipmentId)) {
      newSelected.delete(equipmentId)
      const newQuantities = { ...itemQuantities }
      delete newQuantities[equipmentId]
      setItemQuantities(newQuantities)
    } else {
      newSelected.add(equipmentId)
      setItemQuantities({ ...itemQuantities, [equipmentId]: 1 })
    }
    setSelectedItems(newSelected)
  }

  const handleQuantityChange = (equipmentId: string, quantity: number) => {
    const item = equipment.find(eq => eq.id === equipmentId)
    if (item && quantity > 0 && quantity <= item.quantity) {
      setItemQuantities({ ...itemQuantities, [equipmentId]: quantity })
    }
  }

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!requestForm.requester_name || !requestForm.requester_phone) {
      alert('אנא מלא את כל השדות הנדרשים')
      return
    }

    // Validate name (at least 2 words)
    const nameParts = requestForm.requester_name.trim().split(/\s+/)
    if (nameParts.length < 2) {
      alert('יש להזין שם ושם משפחה (לפחות 2 מילים)')
      return
    }

    // Validate phone (exactly 10 digits, starts with 05)
    const phoneDigits = requestForm.requester_phone.replace(/\D/g, '')
    if (phoneDigits.length !== 10 || !phoneDigits.startsWith('05')) {
      alert('מספר טלפון חייב להיות 10 ספרות ולהתחיל ב-05')
      return
    }

    if (city?.require_call_id === true && !requestForm.call_id?.trim()) {
      alert('מזהה קריאה הוא שדה חובה')
      return
    }

    if (selectedItems.size === 0) {
      alert('אנא בחר לפחות פריט אחד')
      return
    }

    setLoading(true)

    try {
      const items = Array.from(selectedItems).map(equipmentId => ({
        equipment_id: equipmentId,
        quantity: itemQuantities[equipmentId] || 1
      }))

      const response = await fetch('/api/requests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester_name: requestForm.requester_name,
          requester_phone: requestForm.requester_phone,
          call_id: requestForm.call_id || undefined,
          items
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה ביצירת בקשה')
      }

      setCreatedToken(data.token)
      setRequestCreated(true)

    } catch (error: any) {
      console.error('Error creating request:', error)
      alert(error.message || 'אירעה שגיאה ביצירת הבקשה')
    } finally {
      setLoading(false)
    }
  }

  const getRequestUrl = () => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/request/${createdToken}`
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getRequestUrl())
    alert('הקישור הועתק ללוח!')
  }

  const resetRequestForm = () => {
    setRequestForm({ requester_name: '', requester_phone: '', call_id: '', items: [] })
    setSelectedItems(new Set())
    setItemQuantities({})
    setCreatedToken('')
    setRequestCreated(false)
  }

  // === RENDER ===

  if (!city) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">טוען...</p>
        </div>
      </div>
    )
  }

  const isRequestMode = city.request_mode === 'request'

  return (
    <div className="min-h-screen content-wrapper">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Logo />

        {/* Header */}
        <header className="bg-white/90 backdrop-blur-lg border border-gray-200/50 rounded-2xl shadow-xl p-4 sm:p-8 mb-6 sm:mb-8 sm:relative">
          <Link href="/" className="hidden sm:block absolute right-6 top-6">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full hover:bg-gray-100 text-gray-600 transition-all duration-200 hover:scale-110"
              title="חזור לבחירת עיר"
            >
              ↩️
            </Button>
          </Link>
          <Link href={`/city/${cityId}/admin`} className="hidden sm:block absolute left-6 top-6">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full hover:bg-blue-50 text-blue-600 transition-all duration-200 hover:scale-110"
              title="כניסת מנהל"
            >
              🔐
            </Button>
          </Link>
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              ארון ציוד ידידים - {city.name}
            </h1>
            <p className="text-gray-600 text-lg">
              {isRequestMode ? 'מערכת בקשות לאישור מנהל' : 'מערכת חכמה לניהול השאלות והחזרות'}
            </p>
          </div>
        </header>

        {/* Mobile Navigation */}
        <div className="sm:hidden flex gap-3 mb-6">
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full h-14 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-lg transition-all">
              ↩️ חזור לבחירת עיר
            </Button>
          </Link>
          <Link href={`/city/${cityId}/admin`} className="flex-1">
            <Button variant="outline" className="w-full h-14 rounded-xl border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 text-blue-600 font-semibold text-lg transition-all">
              🔐 כניסת מנהל
            </Button>
          </Link>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-3 mb-8">
          <Button
            onClick={() => setActiveTab('borrow')}
            className={`flex-1 py-6 rounded-xl font-semibold text-lg transition-all duration-300 ${
              activeTab === 'borrow'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50 scale-105'
                : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
            }`}
          >
            <span className="text-2xl ml-2">{isRequestMode ? '📝' : '📦'}</span> {isRequestMode ? 'בקשת ציוד' : 'השאלת ציוד'}
          </Button>
          <Button
            onClick={() => setActiveTab('return')}
            className={`flex-1 py-6 rounded-xl font-semibold text-lg transition-all duration-300 ${
              activeTab === 'return'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50 scale-105'
                : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
            }`}
          >
            <span className="text-2xl ml-2">🔁</span> החזרת ציוד
          </Button>
        </div>

        {/* === REQUEST MODE === */}
        {isRequestMode && activeTab === 'borrow' && !requestCreated && (
          <Card className="border-0 shadow-2xl rounded-2xl overflow-visible bg-white/90 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-6">
              <CardTitle className="text-2xl font-bold text-gray-800">בקשה חדשה לציוד</CardTitle>
              <CardDescription className="text-gray-600 text-base">מלא את הפרטים ובחר ציוד מהרשימה</CardDescription>
            </CardHeader>
            <CardContent className="p-6 overflow-visible">
              <form onSubmit={handleCreateRequest} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">👤 שם מלא *</label>
                    <Input
                      value={requestForm.requester_name}
                      onChange={(e) => setRequestForm({ ...requestForm, requester_name: e.target.value })}
                      placeholder="הזן את שמך המלא"
                      className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">📱 מספר טלפון *</label>
                    <Input
                      type="tel"
                      value={requestForm.requester_phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '')
                        if (value.length <= 10) {
                          setRequestForm({ ...requestForm, requester_phone: value })
                        }
                      }}
                      placeholder="0501234567"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                {city?.require_call_id === true && (
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">🆔 מזהה קריאה *</label>
                    <Input
                      value={requestForm.call_id}
                      onChange={(e) => setRequestForm({ ...requestForm, call_id: e.target.value })}
                      placeholder="הזן מזהה קריאה"
                      className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                )}

                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-700">🎒 בחר ציוד (ניתן לבחור מספר פריטים)</label>

                  {/* Search Field */}
                  <div className="relative">
                    <Input
                      type="text"
                      value={equipmentSearch}
                      onChange={(e) => setEquipmentSearch(e.target.value)}
                      placeholder="🔍 חפש ציוד..."
                      className="h-12 border-2 border-gray-300 rounded-xl pr-10 focus:border-blue-500 transition-colors"
                    />
                    {equipmentSearch && (
                      <button
                        type="button"
                        onClick={() => setEquipmentSearch('')}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto border-2 border-gray-200 rounded-xl p-3">
                    {equipment
                      .filter(item => item.quantity > 0 && item.equipment_status === 'working')
                      .filter(item => item.name.toLowerCase().includes(equipmentSearch.toLowerCase()))
                      .map(item => (
                        <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-200">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.id)}
                            onChange={() => handleItemToggle(item.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-800 text-sm truncate">{item.name}</p>
                              {item.is_consumable && (
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex-shrink-0">מתכלה</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-0.5">זמין: {item.quantity}</p>
                          </div>
                          {selectedItems.has(item.id) && item.is_consumable && (
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-xs font-medium text-gray-600">כמות:</span>
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item.id, Math.max(1, (itemQuantities[item.id] || 1) - 1))}
                                disabled={(itemQuantities[item.id] || 1) <= 1}
                                className="w-7 h-7 flex items-center justify-center bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-md transition-all text-sm"
                              >
                                -
                              </button>
                              <span className="w-10 h-7 flex items-center justify-center font-bold text-sm text-gray-800 bg-white border-2 border-gray-300 rounded-md">
                                {itemQuantities[item.id] || 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item.id, Math.min(item.quantity, (itemQuantities[item.id] || 1) + 1))}
                                disabled={(itemQuantities[item.id] || 1) >= item.quantity}
                                className="w-7 h-7 flex items-center justify-center bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-md transition-all text-sm"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    {equipment
                      .filter(item => item.quantity > 0 && item.equipment_status === 'working')
                      .filter(item => item.name.toLowerCase().includes(equipmentSearch.toLowerCase()))
                      .length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        {equipmentSearch ? 'לא נמצא ציוד התואם לחיפוש' : 'אין ציוד זמין כרגע'}
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || selectedItems.size === 0}
                  className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? '⏳ שולח בקשה...' : '✅ שלח בקשה למנהל'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Request Created Success */}
        {isRequestMode && activeTab === 'borrow' && requestCreated && (
          <Card className="border-0 shadow-2xl rounded-2xl overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-100 pb-6">
              <div className="text-center">
                <div className="text-6xl mb-4">✅</div>
                <CardTitle className="text-3xl font-bold text-green-900">הבקשה נשלחה בהצלחה!</CardTitle>
                <CardDescription className="text-green-800 text-lg mt-2">
                  הבקשה שלך נשלחה למנהל העיר לאישור
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="bg-white rounded-xl p-6 border-2 border-green-200">
                <p className="text-sm font-semibold text-gray-700 mb-3">📋 סיכום הבקשה:</p>
                <div className="space-y-2 text-gray-700">
                  <p><span className="font-semibold">שם:</span> {requestForm.requester_name}</p>
                  <p><span className="font-semibold">טלפון:</span> {requestForm.requester_phone}</p>
                  {requestForm.call_id && (
                    <p><span className="font-semibold">מזהה קריאה:</span> {requestForm.call_id}</p>
                  )}
                  <p className="font-semibold mt-3">פריטים שנבחרו:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {Array.from(selectedItems).map(id => {
                      const item = equipment.find(eq => eq.id === id)
                      return (
                        <li key={id}>
                          {item?.name} {item?.is_consumable ? `(כמות: ${itemQuantities[id] || 1})` : ''}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
                <p className="text-sm font-semibold text-gray-700 mb-3 text-center">🔗 הבקשה שלך מוכנה!</p>
                <p className="text-sm text-gray-600 mb-4 text-center">לחץ על הכפתור למטה כדי לפתוח את דף הבקשה</p>
                <Button
                  onClick={() => window.open(getRequestUrl(), '_blank')}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  🔗 פתח את הבקשה
                </Button>
              </div>

              <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200">
                <p className="text-sm text-yellow-800">
                  💡 <span className="font-semibold">שים לב:</span> הטוקן תקף ל-30 דקות. אחרי אישור המנהל תוכל לגשת לדף הבקשה ולראות את קוד הארון.
                </p>
              </div>

              <Button
                onClick={resetRequestForm}
                className="w-full h-12 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-xl"
              >
                🔄 צור בקשה נוספת
              </Button>
            </CardContent>
          </Card>
        )}

        {/* === DIRECT MODE (Existing) === */}
        {!isRequestMode && activeTab === 'borrow' && (
          <Card className="border-0 shadow-2xl rounded-2xl overflow-visible bg-white/90 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-6">
              <CardTitle className="text-2xl font-bold text-gray-800">השאלת ציוד חדשה</CardTitle>
              <CardDescription className="text-gray-600 text-base">מלא את הפרטים ובחר ציוד להשאלה</CardDescription>
            </CardHeader>
            <CardContent className="p-6 overflow-visible">
              <form onSubmit={handleBorrow} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">👤 שם מלא</label>
                    <Input
                      value={borrowForm.name}
                      onChange={(e) => setBorrowForm({ ...borrowForm, name: e.target.value })}
                      placeholder="הזן את שמך המלא"
                      className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">📱 מספר טלפון</label>
                    <Input
                      type="tel"
                      value={borrowForm.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '')
                        if (value.length <= 10) {
                          setBorrowForm({ ...borrowForm, phone: value })
                        }
                      }}
                      placeholder="0501234567"
                      pattern="[0-9]{10}"
                      title="נא להזין מספר טלפון תקין בן 10 ספרות"
                      maxLength={10}
                      className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">🎒 בחר ציוד</label>
                  {equipment.filter(item => item.quantity > 0 && item.equipment_status === 'working').length === 0 ? (
                    <div className="w-full p-4 border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl text-orange-700 text-center font-medium">
                      ⚠️ אין ציוד זמין כרגע. אנא נסה שוב מאוחר יותר.
                    </div>
                  ) : (
                    <div className="relative equipment-search-container">
                      <Input
                        value={equipmentSearch}
                        onChange={(e) => {
                          setEquipmentSearch(e.target.value)
                          setShowEquipmentDropdown(true)
                        }}
                        onFocus={() => setShowEquipmentDropdown(true)}
                        placeholder="חפש או בחר ציוד..."
                        className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-colors"
                      />
                      {showEquipmentDropdown && (
                        <div className="absolute z-[9999] w-full mt-1 max-h-96 overflow-y-auto bg-white border-2 border-gray-200 rounded-xl shadow-lg">
                          {equipment
                            .filter(item =>
                              item.quantity > 0 &&
                              item.equipment_status === 'working' &&
                              item.name.toLowerCase().includes(equipmentSearch.toLowerCase())
                            )
                            .map(item => (
                              <div
                                key={item.id}
                                onClick={() => {
                                  setBorrowForm({ ...borrowForm, equipment_id: item.id })
                                  setEquipmentSearch(item.name)
                                  setShowEquipmentDropdown(false)
                                }}
                                className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-100 last:border-0"
                              >
                                <div className="flex justify-between items-center">
                                  <span className="font-medium text-gray-800">{item.name}</span>
                                  <span className="text-sm text-green-600 font-semibold">זמין: {item.quantity}</span>
                                </div>
                              </div>
                            ))}
                          {equipment.filter(item =>
                            item.quantity > 0 &&
                            item.name.toLowerCase().includes(equipmentSearch.toLowerCase())
                          ).length === 0 && (
                            <div className="px-4 py-3 text-center text-gray-500">
                              לא נמצאו תוצאות
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={loading || equipment.filter(item => item.quantity > 0).length === 0}
                  className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? '⏳ מעבד...' : '✅ השאל ציוד עכשיו'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Return Tab (Same for both modes) */}
        {activeTab === 'return' && (
          <Card className="border-0 shadow-2xl rounded-2xl overflow-hidden bg-white/90 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-6">
              <CardTitle className="text-2xl font-bold text-gray-800">החזרת ציוד</CardTitle>
              <CardDescription className="text-gray-600 text-base">הזן מספר טלפון כדי לצפות בציוד שהשאלת</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">📱 מספר טלפון</label>
                  <div className="flex gap-3">
                    <Input
                      type="tel"
                      value={returnForm.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '')
                        if (value.length <= 10) {
                          setReturnForm({ phone: value })
                        }
                      }}
                      placeholder="0501234567"
                      pattern="[0-9]{10}"
                      title="נא להזין מספר טלפון תקין בן 10 ספרות"
                      maxLength={10}
                      className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-colors"
                    />
                    <Button
                      onClick={handleReturnSearch}
                      className="h-12 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all"
                    >
                      🔍 חפש
                    </Button>
                  </div>
                </div>

                {userBorrows.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg text-gray-800 border-b-2 border-blue-500 pb-2">📦 ציוד שהשאלת:</h3>
                    <div className="space-y-3">
                      {userBorrows.map(borrow => (
                        <div key={borrow.id} className="border-2 border-blue-200 rounded-xl overflow-hidden">
                          <div className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-50 to-indigo-50 hover:shadow-lg transition-all duration-200">
                            <div className="flex-1">
                              <p className="font-bold text-lg text-gray-800">{borrow.equipment_name}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                🕐 הושאל: {new Date(borrow.borrow_date).toLocaleDateString('he-IL')}
                              </p>
                            </div>
                            <Button
                              onClick={() => {
                                setReturnStatus({ borrowId: borrow.id, equipmentId: borrow.equipment_id })
                                setSelectedStatus('working')
                              }}
                              disabled={loading}
                              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold px-6 py-2 rounded-xl shadow-md hover:shadow-lg transition-all"
                            >
                              ✅ החזר
                            </Button>
                          </div>

                          {/* Status Selection Dialog */}
                          {returnStatus && returnStatus.borrowId === borrow.id && (
                            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-t-2 border-yellow-200 p-6">
                              <h4 className="font-bold text-gray-900 mb-3">מה מצב הציוד שמוחזר?</h4>

                              <div className="grid grid-cols-2 gap-3 mb-4">
                                <button
                                  onClick={() => {
                                    setSelectedStatus('working')
                                    setFaultyNotes('')
                                  }}
                                  className={`p-4 rounded-xl border-2 font-semibold transition-all ${
                                    selectedStatus === 'working'
                                      ? 'bg-green-100 border-green-500 text-green-800 shadow-md scale-105'
                                      : 'bg-white border-gray-300 text-gray-700 hover:border-green-300'
                                  }`}
                                >
                                  <div className="text-2xl mb-1">✅</div>
                                  <div>תקין</div>
                                </button>

                                <button
                                  onClick={() => setSelectedStatus('faulty')}
                                  className={`p-4 rounded-xl border-2 font-semibold transition-all ${
                                    selectedStatus === 'faulty'
                                      ? 'bg-orange-100 border-orange-500 text-orange-800 shadow-md scale-105'
                                      : 'bg-white border-gray-300 text-gray-700 hover:border-orange-300'
                                  }`}
                                >
                                  <div className="text-2xl mb-1">⚠️</div>
                                  <div>תקול</div>
                                </button>
                              </div>

                              {/* Faulty Notes - Required when status is faulty */}
                              {selectedStatus === 'faulty' && (
                                <div className="mb-4 p-4 bg-orange-50 border-2 border-orange-200 rounded-xl">
                                  <label className="block text-sm font-bold text-orange-800 mb-2">
                                    ⚠️ פרט מה קרה לציוד (חובה) *
                                  </label>
                                  <textarea
                                    value={faultyNotes}
                                    onChange={(e) => setFaultyNotes(e.target.value)}
                                    placeholder="למשל: שבור, חסר חלקים, לא עובד, וכו..."
                                    className="w-full p-3 border-2 border-orange-300 rounded-lg focus:border-orange-500 focus:outline-none resize-none"
                                    rows={3}
                                    required
                                  />
                                  <p className="text-xs text-orange-600 mt-1">
                                    נא לתאר בקצרה את מצב הציוד והבעיה
                                  </p>
                                </div>
                              )}

                              <div className="flex gap-3">
                                <Button
                                  onClick={() => handleReturn(returnStatus.borrowId, returnStatus.equipmentId, selectedStatus)}
                                  disabled={loading}
                                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md"
                                >
                                  אשר החזרה
                                </Button>
                                <Button
                                  onClick={() => {
                                    setReturnStatus(null)
                                    setSelectedStatus('working')
                                    setFaultyNotes('')
                                  }}
                                  variant="outline"
                                  className="border-2 border-gray-300 rounded-xl"
                                >
                                  ביטול
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {returnForm.phone && userBorrows.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                    <p className="text-gray-500 text-lg">ℹ️ לא נמצא ציוד השאלה פעיל</p>
                    <p className="text-gray-400 text-sm mt-1">עבור מספר טלפון זה</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Equipment Inventory */}
        <Card className="mt-8 border-0 shadow-2xl rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-6">
            <CardTitle className="text-2xl font-bold text-gray-800">📊 מלאי ציוד</CardTitle>
            <CardDescription className="text-gray-600">סטטוס זמינות ציוד במערכת</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {equipment.map(item => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 ${
                    item.quantity > 0 && item.equipment_status === 'working'
                      ? 'bg-gradient-to-l from-green-50 to-white border-green-200 hover:border-green-400 hover:shadow-md'
                      : item.equipment_status === 'faulty'
                      ? 'bg-gradient-to-l from-orange-50 to-white border-orange-200 hover:border-orange-300'
                      : 'bg-gradient-to-l from-gray-50 to-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {item.equipment_status === 'faulty' ? '⚠️' : item.quantity > 0 ? '✅' : '❌'}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-800">{item.name}</p>
                      {item.quantity === 0 && (
                        <p className="text-xs text-red-600 font-medium">חסר זמנית</p>
                      )}
                      {item.equipment_status === 'faulty' && (
                        <p className="text-xs text-orange-600 font-medium">ציוד תקול - לא זמין להשאלה</p>
                      )}
                      {item.is_consumable && item.quantity > 0 && item.equipment_status === 'working' && (
                        <p className="text-xs text-purple-600 font-medium">🔄 ציוד מתכלה</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
