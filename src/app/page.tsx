'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { Equipment, BorrowHistory, BorrowForm, ReturnForm } from '@/types'

export default function Home() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [borrowHistory, setBorrowHistory] = useState<BorrowHistory[]>([])
  const [activeTab, setActiveTab] = useState<'borrow' | 'return'>('borrow')
  const [borrowForm, setBorrowForm] = useState<BorrowForm>({ name: '', phone: '', equipment_id: '' })
  const [returnForm, setReturnForm] = useState<ReturnForm>({ phone: '' })
  const [userBorrows, setUserBorrows] = useState<BorrowHistory[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchEquipment()
  }, [])

  const fetchEquipment = async () => {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
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

    try {
      // Create borrow record
      const { data: borrowData, error: borrowError } = await supabase
        .from('borrow_history')
        .insert({
          name: borrowForm.name,
          phone: borrowForm.phone,
          equipment_id: borrowForm.equipment_id,
          equipment_name: selectedEquipment.name,
          status: 'borrowed'
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

      alert('הציוד הושאל בהצלחה!')
      setBorrowForm({ name: '', phone: '', equipment_id: '' })
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-lg border border-gray-200/50 rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">ארון ציוד ידידים</h1>
              <p className="text-gray-600 text-lg">מערכת חכמה לניהול השאלות והחזרות</p>
            </div>
            <Link href="/admin">
              <Button
                variant="outline"
                className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold px-6 py-2 rounded-xl transition-all duration-200 hover:scale-105"
              >
                🔐 כניסת מנהל
              </Button>
            </Link>
          </div>
        </header>

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
          <Card className="border-0 shadow-2xl rounded-2xl overflow-hidden bg-white/90 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-6">
              <CardTitle className="text-2xl font-bold text-gray-800">השאלת ציוד חדשה</CardTitle>
              <CardDescription className="text-gray-600 text-base">מלא את הפרטים ובחר ציוד להשאלה</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
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
                      value={borrowForm.phone}
                      onChange={(e) => setBorrowForm({ ...borrowForm, phone: e.target.value })}
                      placeholder="05X-XXXXXXX"
                      className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">🎒 בחר ציוד</label>
                  {equipment.filter(item => item.quantity > 0).length === 0 ? (
                    <div className="w-full p-4 border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl text-orange-700 text-center font-medium">
                      ⚠️ אין ציוד זמין כרגע. אנא נסה שוב מאוחר יותר.
                    </div>
                  ) : (
                    <select
                      value={borrowForm.equipment_id}
                      onChange={(e) => setBorrowForm({ ...borrowForm, equipment_id: e.target.value })}
                      className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none bg-white transition-colors"
                      required
                    >
                      <option value="">בחר ציוד מהרשימה</option>
                      {equipment
                        .filter(item => item.quantity > 0)
                        .map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name} (זמין: {item.quantity})
                          </option>
                        ))}
                    </select>
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
                      value={returnForm.phone}
                      onChange={(e) => setReturnForm({ phone: e.target.value })}
                      placeholder="05X-XXXXXXX"
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

        {/* Equipment Inventory */}
        <Card className="mt-8 border-0 shadow-2xl rounded-2xl overflow-hidden bg-white/90 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-6">
            <CardTitle className="text-2xl font-bold text-gray-800">📊 מלאי ציוד זמין</CardTitle>
            <CardDescription className="text-gray-600">כל הציוד הזמין במערכת</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {equipment.map(item => (
                <div 
                  key={item.id} 
                  className={`group p-5 rounded-xl border-2 transition-all duration-300 hover:shadow-xl hover:scale-105 ${
                    item.quantity > 0 
                      ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:border-green-400' 
                      : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-lg text-gray-800 group-hover:text-blue-600 transition-colors">{item.name}</h3>
                    <span className="text-2xl">{item.quantity > 0 ? '✅' : '❌'}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">כמות זמינה:</span>
                      <span className={`font-bold text-lg ${
                        item.quantity > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.quantity}
                      </span>
                    </div>
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                      item.quantity > 0 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {item.quantity > 0 ? '🟢 זמין' : '🔴 אזל מהמלאי'}
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
