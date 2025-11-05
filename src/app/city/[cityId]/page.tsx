'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { Equipment, BorrowHistory, BorrowForm, ReturnForm, City } from '@/types'
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

  useEffect(() => {
    if (cityId) {
      fetchCity()
      fetchEquipment()
    }
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

  const handleBorrow = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!borrowForm.name || !borrowForm.phone || !borrowForm.equipment_id) {
      alert('אנא מלא את כל השדות')
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
      // For consumable items, mark as returned immediately
      const isConsumable = selectedEquipment.is_consumable
      const borrowStatus = isConsumable ? 'returned' : 'borrowed'
      const returnDate = isConsumable ? new Date().toISOString() : null

      // Create borrow record
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

      // Update equipment quantity
      const { error: updateError } = await supabase
        .from('equipment')
        .update({ quantity: selectedEquipment.quantity - 1 })
        .eq('id', borrowForm.equipment_id)

      if (updateError) throw updateError

      if (isConsumable) {
        alert('הציוד המתכלה נרשם בהצלחה! (לא דורש החזרה)')
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

  const handleReturn = async (borrowId: string, equipmentId: string) => {
    setLoading(true)
    
    try {
      // Update borrow record
      const { error: updateError } = await supabase
        .from('borrow_history')
        .update({ 
          status: 'returned',
          return_date: new Date().toISOString()
        })
        .eq('id', borrowId)

      if (updateError) throw updateError

      // Get current equipment quantity
      const equipmentItem = equipment.find(eq => eq.id === equipmentId)
      if (equipmentItem) {
        // Update equipment quantity
        const { error: qtyUpdateError } = await supabase
          .from('equipment')
          .update({ quantity: equipmentItem.quantity + 1 })
          .eq('id', equipmentId)

        if (qtyUpdateError) throw qtyUpdateError
      }

      alert('הציוד הוחזר בהצלחה!')
      handleReturnSearch()
      fetchEquipment()
    } catch (error) {
      console.error('Error returning equipment:', error)
      alert('אירעה שגיאה בהחזרת הציוד')
    } finally {
      setLoading(false)
    }
  }

  if (!city) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">טוען...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen content-wrapper">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Logo */}
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
            <p className="text-gray-600 text-lg">מערכת חכמה לניהול השאלות והחזרות</p>
          </div>
        </header>

        {/* Mobile Navigation Buttons - Below Header */}
        <div className="sm:hidden flex gap-3 mb-6">
          <Link href="/" className="flex-1">
            <Button
              variant="outline"
              className="w-full h-14 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-lg transition-all"
            >
              ↩️ חזור לבחירת עיר
            </Button>
          </Link>
          <Link href={`/city/${cityId}/admin`} className="flex-1">
            <Button
              variant="outline"
              className="w-full h-14 rounded-xl border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 text-blue-600 font-semibold text-lg transition-all"
            >
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
            <span className="text-2xl ml-2">📦</span> השאלת ציוד
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

        {activeTab === 'borrow' && (
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
                        <div key={borrow.id} className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl hover:shadow-lg transition-all duration-200">
                          <div className="flex-1">
                            <p className="font-bold text-lg text-gray-800">{borrow.equipment_name}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              🕐 הושאל: {new Date(borrow.borrow_date).toLocaleDateString('he-IL')}
                            </p>
                          </div>
                          <Button
                            onClick={() => handleReturn(borrow.id, borrow.equipment_id)}
                            disabled={loading}
                            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold px-6 py-2 rounded-xl shadow-md hover:shadow-lg transition-all"
                          >
                            ✅ החזר
                          </Button>
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

        {/* Equipment Inventory - Compact List */}
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
                        <p className="text-xs text-purple-600 font-medium">🔄 ציוד מתכלה - לא דורש החזרה</p>
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
