'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { Equipment, BorrowHistory, City } from '@/types'
import { ArrowRight, FileDown, Printer } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function CityAdminPage() {
  const params = useParams()
  const cityId = params.cityId as string

  const [city, setCity] = useState<City | null>(null)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [borrowHistory, setBorrowHistory] = useState<BorrowHistory[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'equipment' | 'history' | 'settings'>('equipment')
  const [newEquipment, setNewEquipment] = useState({ name: '', quantity: 0 })
  const [editingEquipment, setEditingEquipment] = useState<{ id: string; name: string; quantity: number } | null>(null)
  const [changePasswordForm, setChangePasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showChangePassword, setShowChangePassword] = useState(false)

  useEffect(() => {
    if (cityId) {
      fetchCity()
    }
  }, [cityId])

  useEffect(() => {
    if (isAuthenticated && cityId) {
      fetchData()
    }
  }, [isAuthenticated, cityId])

  const fetchCity = async () => {
    try {
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
    } catch (error) {
      console.error('Error fetching city:', error)
    }
  }

  const fetchData = async () => {
    await Promise.all([fetchEquipment(), fetchHistory()])
  }

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

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from('borrow_history')
      .select('*')
      .eq('city_id', cityId)
      .order('borrow_date', { ascending: false })

    if (error) {
      console.error('Error fetching history:', error)
    } else {
      setBorrowHistory(data || [])
    }
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!city) {
      alert('שגיאה בטעינת נתוני העיר')
      return
    }
    if (password === city.password) {
      setIsAuthenticated(true)
      setPassword('')
    } else {
      alert('סיסמה שגויה')
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!city) {
      alert('שגיאה בטעינת נתוני העיר')
      return
    }

    if (changePasswordForm.currentPassword !== city.password) {
      alert('הסיסמה הנוכחית שגויה')
      return
    }

    if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
      alert('הסיסמאות החדשות אינן תואמות')
      return
    }

    if (changePasswordForm.newPassword.length < 4) {
      alert('הסיסמה החדשה חייבת להכיל לפחות 4 תווים')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('cities')
        .update({ password: changePasswordForm.newPassword })
        .eq('id', cityId)

      if (error) throw error

      alert('הסיסמה שונתה בהצלחה!')
      // Update local city state
      setCity({ ...city, password: changePasswordForm.newPassword })
      setChangePasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setShowChangePassword(false)
    } catch (error) {
      console.error('Error changing password:', error)
      alert('אירעה שגיאה בשינוי הסיסמה')
    } finally {
      setLoading(false)
    }
  }

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEquipment.name || newEquipment.quantity < 0) {
      alert('אנא מלא שם וכמות תקינים')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('equipment')
        .insert({
          name: newEquipment.name,
          quantity: newEquipment.quantity,
          city_id: cityId
        })

      if (error) throw error

      alert('הציוד נוסף בהצלחה!')
      setNewEquipment({ name: '', quantity: 0 })
      fetchEquipment()
    } catch (error) {
      console.error('Error adding equipment:', error)
      alert('אירעה שגיאה בהוספת הציוד')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateEquipment = async (id: string, name: string, quantity: number) => {
    if (!name || quantity < 0) {
      alert('אנא מלא שם וכמות תקינים')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('equipment')
        .update({ name, quantity })
        .eq('id', id)

      if (error) throw error

      alert('הציוד עודכן בהצלחה!')
      setEditingEquipment(null)
      fetchEquipment()
    } catch (error) {
      console.error('Error updating equipment:', error)
      alert('אירעה שגיאה בעדכון הציוד')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEquipment = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק פריט זה?')) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('הציוד נמחק בהצלחה!')
      fetchEquipment()
    } catch (error) {
      console.error('Error deleting equipment:', error)
      alert('אירעה שגיאה במחיקת הציוד')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateHistoryStatus = async (id: string, status: 'borrowed' | 'returned') => {
    setLoading(true)
    try {
      const updateData: any = { status }
      if (status === 'returned') {
        updateData.return_date = new Date().toISOString()
      }

      const { error } = await supabase
        .from('borrow_history')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      fetchHistory()
    } catch (error) {
      console.error('Error updating history:', error)
      alert('אירעה שגיאה בעדכון ההיסטוריה')
    } finally {
      setLoading(false)
    }
  }

  // Export to Excel
  const handleExportToExcel = () => {
    if (!city) return

    // Prepare equipment data
    const equipmentData = equipment.map((item, index) => ({
      'מס׳': index + 1,
      'שם הציוד': item.name,
      'כמות זמינה': item.quantity,
    }))

    // Prepare history data
    const historyData = borrowHistory.map((item, index) => ({
      'מס׳': index + 1,
      'שם לווה': item.name,
      'טלפון': item.phone,
      'ציוד': item.equipment_name,
      'כמות': item.quantity,
      'תאריך השאלה': new Date(item.borrow_date).toLocaleDateString('he-IL'),
      'תאריך החזרה': item.return_date ? new Date(item.return_date).toLocaleDateString('he-IL') : 'טרם הוחזר',
      'סטטוס': item.status === 'borrowed' ? 'מושאל' : 'הוחזר',
      'הערות': item.notes || '-',
    }))

    // Create workbook
    const wb = XLSX.utils.book_new()

    // Add equipment sheet
    const wsEquipment = XLSX.utils.json_to_sheet(equipmentData)
    XLSX.utils.book_append_sheet(wb, wsEquipment, 'ציוד')

    // Add history sheet
    const wsHistory = XLSX.utils.json_to_sheet(historyData)
    XLSX.utils.book_append_sheet(wb, wsHistory, 'היסטוריית השאלות')

    // Generate file name with date
    const fileName = `${city.name}_דוח_ציוד_${new Date().toLocaleDateString('he-IL').replace(/\//g, '-')}.xlsx`

    // Save file
    XLSX.writeFile(wb, fileName)
  }

  // Print functionality
  const handlePrint = () => {
    window.print()
  }

  const handleDeleteHistory = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק רשומה זו?')) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('borrow_history')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('הרשומה נמחקה בהצלחה!')
      fetchHistory()
    } catch (error) {
      console.error('Error deleting history:', error)
      alert('אירעה שגיאה במחיקת הרשומה')
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white pb-8">
            <div className="text-center">
              <div className="text-5xl mb-4">🔐</div>
              <CardTitle className="text-3xl font-bold mb-2">כניסת מנהל - {city?.name}</CardTitle>
              <CardDescription className="text-blue-100 text-base">הזן סיסמת מנהל לגישה לפאנל הניהול</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">🔑 סיסמת מנהל</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="הזן סיסמה"
                  className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-colors"
                  required
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={!city}
                  className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50"
                >
                  ✅ כניסה למערכת
                </Button>
                <Link href={`/city/${cityId}`} className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold text-lg rounded-xl transition-all duration-200 hover:scale-105"
                  >
                    ↩️ חזור
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            margin: 1cm;
            size: A4;
          }
        }
      `}</style>

    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <header className="bg-white/80 backdrop-blur-lg border border-gray-200/50 rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                🛡️ פאנל ניהול - {city?.name}
              </h1>
              <p className="text-gray-600 text-lg">ניהול ציוד והיסטוריית השאלות</p>
            </div>
            <div className="flex gap-3 print:hidden">
              <Link href={`/city/${cityId}`}>
                <Button
                  variant="outline"
                  className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold px-6 py-2 rounded-xl transition-all duration-200 hover:scale-105"
                >
                  <ArrowRight className="ml-2 h-4 w-4" />
                  חזרה לממשק משתמש
                </Button>
              </Link>
              <Button
                onClick={() => setIsAuthenticated(false)}
                className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-semibold px-6 py-2 rounded-xl transition-all duration-200 hover:scale-105"
              >
                🚪 יציאה
              </Button>
            </div>
          </div>
        </header>

        {/* Export and Print Buttons */}
        <div className="mb-6 flex gap-3 justify-center print:hidden">
          <Button
            onClick={handleExportToExcel}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            <FileDown className="ml-2 h-5 w-5" />
            ייצוא לאקסל
          </Button>
          <Button
            onClick={handlePrint}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            <Printer className="ml-2 h-5 w-5" />
            הדפסה
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8 print:hidden">
          <Button
            onClick={() => setActiveTab('equipment')}
            className={`py-6 rounded-xl font-semibold text-lg transition-all duration-300 ${
              activeTab === 'equipment'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50 scale-105'
                : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
            }`}
          >
            <span className="text-2xl ml-2">📦</span> ניהול ציוד
          </Button>
          <Button
            onClick={() => setActiveTab('history')}
            className={`py-6 rounded-xl font-semibold text-lg transition-all duration-300 ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50 scale-105'
                : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
            }`}
          >
            <span className="text-2xl ml-2">📊</span> היסטוריית השאלות
          </Button>
          <Button
            onClick={() => setActiveTab('settings')}
            className={`py-6 rounded-xl font-semibold text-lg transition-all duration-300 ${
              activeTab === 'settings'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50 scale-105'
                : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
            }`}
          >
            <span className="text-2xl ml-2">⚙️</span> הגדרות
          </Button>
        </div>

        {activeTab === 'equipment' && (
          <div className="space-y-6">
            <Card className="border-0 shadow-2xl rounded-2xl overflow-hidden bg-white/90 backdrop-blur-sm mb-6">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 pb-4">
                <CardTitle className="text-xl font-bold text-gray-800">➕ הוספת ציוד חדש</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleAddEquipment} className="flex gap-4">
                  <Input
                    value={newEquipment.name}
                    onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
                    placeholder="שם הציוד"
                    className="flex-1 h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-colors"
                  />
                  <Input
                    type="number"
                    value={newEquipment.quantity}
                    onChange={(e) => setNewEquipment({ ...newEquipment, quantity: parseInt(e.target.value) || 0 })}
                    placeholder="כמות"
                    className="w-20 h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-colors"
                  />
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="h-12 px-8 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                  >
                    ✅ הוסף
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-2xl rounded-2xl overflow-hidden bg-white/90 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-6">
                <CardTitle className="text-2xl font-bold text-gray-800">📋 רשימת ציוד</CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6">
                {/* Mobile View */}
                <div className="block md:hidden space-y-4">
                  {equipment.map(item => (
                    <div key={item.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
                      {editingEquipment?.id === item.id ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">🎯 שם הציוד</label>
                            <Input
                              value={editingEquipment.name}
                              onChange={(e) => setEditingEquipment({ ...editingEquipment, name: e.target.value })}
                              className="w-full h-12 border-2 border-blue-300 rounded-lg text-base"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">🔢 כמות</label>
                            <Input
                              type="number"
                              value={editingEquipment.quantity}
                              onChange={(e) => setEditingEquipment({ ...editingEquipment, quantity: parseInt(e.target.value) || 0 })}
                              className="w-full h-12 border-2 border-blue-300 rounded-lg text-base"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleUpdateEquipment(item.id, editingEquipment.name, editingEquipment.quantity)}
                              disabled={loading}
                              className="flex-1 h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg"
                            >
                              ✅ שמור
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setEditingEquipment(null)}
                              className="flex-1 h-12 border-2 border-gray-400 rounded-lg"
                            >
                              ❌ ביטול
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-bold text-lg text-gray-800">{item.name}</p>
                              <p className={`text-2xl font-bold mt-1 ${item.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {item.quantity} יחידות
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => setEditingEquipment({ id: item.id, name: item.name, quantity: item.quantity })}
                              className="flex-1 h-11 border-2 border-blue-500 text-blue-600 hover:bg-blue-50 bg-white rounded-lg"
                            >
                              ✏️ ערוך
                            </Button>
                            <Button
                              onClick={() => handleDeleteEquipment(item.id)}
                              disabled={loading}
                              className="flex-1 h-11 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white rounded-lg"
                            >
                              🗑️ מחק
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-100 to-indigo-100 border-b-2 border-blue-200">
                        <th className="text-right p-4 font-bold text-gray-700">🎯 שם הציוד</th>
                        <th className="text-right p-4 font-bold text-gray-700">🔢 כמות</th>
                        <th className="text-right p-4 font-bold text-gray-700">⚙️ פעולות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipment.map(item => (
                        <tr key={item.id} className="border-b hover:bg-blue-50 transition-colors">
                          <td className="p-4">
                            {editingEquipment?.id === item.id ? (
                              <Input
                                value={editingEquipment.name}
                                onChange={(e) => setEditingEquipment({ ...editingEquipment, name: e.target.value })}
                                className="w-full h-10 border-2 border-blue-300 rounded-lg"
                              />
                            ) : (
                              <span className="font-medium text-gray-800">{item.name}</span>
                            )}
                          </td>
                          <td className="p-4">
                            {editingEquipment?.id === item.id ? (
                              <Input
                                type="number"
                                value={editingEquipment.quantity}
                                onChange={(e) => setEditingEquipment({ ...editingEquipment, quantity: parseInt(e.target.value) || 0 })}
                                className="w-24 h-10 border-2 border-blue-300 rounded-lg"
                              />
                            ) : (
                              <span className={`font-bold text-lg ${
                                item.quantity > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>{item.quantity}</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              {editingEquipment?.id === item.id ? (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateEquipment(item.id, editingEquipment.name, editingEquipment.quantity)}
                                    disabled={loading}
                                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg"
                                  >
                                    ✅ שמור
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingEquipment(null)}
                                    className="border-2 border-gray-400 rounded-lg"
                                  >
                                    ❌ ביטול
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingEquipment({ id: item.id, name: item.name, quantity: item.quantity })}
                                    className="border-2 border-blue-500 text-blue-600 hover:bg-blue-50 rounded-lg"
                                  >
                                    ✏️ ערוך
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeleteEquipment(item.id)}
                                    disabled={loading}
                                    className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 rounded-lg"
                                  >
                                    🗑️ מחק
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'history' && (
          <Card className="border-0 shadow-2xl rounded-2xl overflow-hidden bg-white/90 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-6">
              <CardTitle className="text-2xl font-bold text-gray-800">📊 היסטוריית השאלות</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6">
              {/* Mobile View */}
              <div className="block md:hidden space-y-4">
                {borrowHistory.map(record => (
                  <div key={record.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs text-gray-600 font-semibold">🎯 ציוד</p>
                          <p className="font-bold text-lg text-gray-800">{record.equipment_name}</p>
                        </div>
                        <select
                          value={record.status}
                          onChange={(e) => handleUpdateHistoryStatus(record.id, e.target.value as 'borrowed' | 'returned')}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs border-2 transition-colors ${
                            record.status === 'borrowed'
                              ? 'bg-orange-50 border-orange-300 text-orange-700'
                              : 'bg-green-50 border-green-300 text-green-700'
                          }`}
                          disabled={loading}
                        >
                          <option value="borrowed">🟠 הושאל</option>
                          <option value="returned">🟢 הוחזר</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                        <div>
                          <p className="text-xs text-gray-600">👤 שם</p>
                          <p className="font-medium text-gray-800">{record.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">📱 טלפון</p>
                          <p className="font-medium text-gray-800 text-sm">{record.phone}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-gray-600">📅 הושאל</p>
                          <p className="font-medium text-gray-800 text-sm">{new Date(record.borrow_date).toLocaleDateString('he-IL')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">📅 הוחזר</p>
                          <p className="font-medium text-gray-800 text-sm">
                            {record.return_date ? new Date(record.return_date).toLocaleDateString('he-IL') : '➖'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDeleteHistory(record.id)}
                      disabled={loading}
                      className="w-full h-11 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white rounded-lg"
                    >
                      🗑️ מחק רשומה
                    </Button>
                  </div>
                ))}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-100 to-indigo-100 border-b-2 border-blue-200">
                      <th className="text-right p-4 font-bold text-gray-700">📅 תאריך השאלה</th>
                      <th className="text-right p-4 font-bold text-gray-700">👤 שם</th>
                      <th className="text-right p-4 font-bold text-gray-700">📱 טלפון</th>
                      <th className="text-right p-4 font-bold text-gray-700">🎯 ציוד</th>
                      <th className="text-right p-4 font-bold text-gray-700">🟢 סטטוס</th>
                      <th className="text-right p-4 font-bold text-gray-700">📅 תאריך החזרה</th>
                      <th className="text-right p-4 font-bold text-gray-700">⚙️ פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {borrowHistory.map(record => (
                      <tr key={record.id} className="border-b hover:bg-blue-50 transition-colors">
                        <td className="p-4 text-gray-700">{new Date(record.borrow_date).toLocaleDateString('he-IL')}</td>
                        <td className="p-4 font-medium text-gray-800">{record.name}</td>
                        <td className="p-4 text-gray-600">{record.phone}</td>
                        <td className="p-4 font-medium text-gray-800">{record.equipment_name}</td>
                        <td className="p-4">
                          <select
                            value={record.status}
                            onChange={(e) => handleUpdateHistoryStatus(record.id, e.target.value as 'borrowed' | 'returned')}
                            className={`px-4 py-2 rounded-xl font-bold text-sm border-2 transition-colors ${
                              record.status === 'borrowed'
                                ? 'bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100'
                                : 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                            }`}
                            disabled={loading}
                          >
                            <option value="borrowed">🟠 הושאל</option>
                            <option value="returned">🟢 הוחזר</option>
                          </select>
                        </td>
                        <td className="p-4 text-gray-600">
                          {record.return_date ? new Date(record.return_date).toLocaleDateString('he-IL') : '➖'}
                        </td>
                        <td className="p-4">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteHistory(record.id)}
                            disabled={loading}
                            className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 rounded-lg"
                          >
                            🗑️ מחק
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'settings' && (
          <Card className="border-0 shadow-2xl rounded-2xl overflow-hidden bg-white/90 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-6">
              <CardTitle className="text-2xl font-bold text-gray-800">⚙️ הגדרות מערכת</CardTitle>
              <CardDescription className="text-gray-600">ניהול הגדרות אבטחה ומערכת</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {!showChangePassword ? (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">🔐 סיסמת מנהל</h3>
                        <p className="text-sm text-gray-600">שנה את סיסמת הכניסה לפאנל הניהול</p>
                      </div>
                      <Button
                        onClick={() => setShowChangePassword(true)}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105"
                      >
                        שנה סיסמה
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-gray-800">שינוי סיסמת מנהל</CardTitle>
                      <CardDescription>הזן את הסיסמה הנוכחית והסיסמה החדשה</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleChangePassword} className="space-y-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">🔑 סיסמה נוכחית</label>
                          <Input
                            type="password"
                            value={changePasswordForm.currentPassword}
                            onChange={(e) => setChangePasswordForm({ ...changePasswordForm, currentPassword: e.target.value })}
                            placeholder="הזן סיסמה נוכחית"
                            className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-colors"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">🆕 סיסמה חדשה</label>
                          <Input
                            type="password"
                            value={changePasswordForm.newPassword}
                            onChange={(e) => setChangePasswordForm({ ...changePasswordForm, newPassword: e.target.value })}
                            placeholder="הזן סיסמה חדשה"
                            className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-colors"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">✅ אימות סיסמה חדשה</label>
                          <Input
                            type="password"
                            value={changePasswordForm.confirmPassword}
                            onChange={(e) => setChangePasswordForm({ ...changePasswordForm, confirmPassword: e.target.value })}
                            placeholder="הזן שוב את הסיסמה החדשה"
                            className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-colors"
                            required
                          />
                        </div>
                        <div className="flex gap-3 pt-2">
                          <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1 h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                          >
                            {loading ? '⏳ משנה...' : '✅ שמור סיסמה חדשה'}
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              setShowChangePassword(false)
                              setChangePasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
                            }}
                            className="flex-1 h-12 bg-white border-2 border-gray-400 text-gray-700 hover:bg-gray-50 font-semibold rounded-xl transition-all"
                          >
                            ❌ ביטול
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}

                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-6 border-2 border-yellow-200">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h3 className="font-bold text-gray-800 mb-2">הערות אבטחה חשובות</h3>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• הסיסמה נשמרת במסד הנתונים Supabase</li>
                        <li>• ודא שהסיסמה מכילה לפחות 4 תווים</li>
                        <li>• שמור את הסיסמה במקום בטוח</li>
                        <li>• שנה סיסמה באופן קבוע לאבטחה מירבית</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
    </>
  )
}
