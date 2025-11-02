'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { Equipment, BorrowHistory } from '@/types'
import { ArrowRight } from 'lucide-react'

export default function AdminPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [borrowHistory, setBorrowHistory] = useState<BorrowHistory[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'equipment' | 'history'>('equipment')
  const [newEquipment, setNewEquipment] = useState({ name: '', quantity: 0 })
  const [editingEquipment, setEditingEquipment] = useState<{ id: string; name: string; quantity: number } | null>(null)

  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || '1234'

  useEffect(() => {
    if (isAuthenticated) {
      fetchData()
    }
  }, [isAuthenticated])

  const fetchData = async () => {
    await Promise.all([fetchEquipment(), fetchHistory()])
  }

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

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from('borrow_history')
      .select('*')
      .order('borrow_date', { ascending: false })
    
    if (error) {
      console.error('Error fetching history:', error)
    } else {
      setBorrowHistory(data || [])
    }
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      setPassword('')
    } else {
      alert('סיסמה שגויה')
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
          quantity: newEquipment.quantity
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
              <CardTitle className="text-3xl font-bold mb-2">כניסת מנהל</CardTitle>
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
              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                ✅ כניסה למערכת
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <header className="bg-white/80 backdrop-blur-lg border border-gray-200/50 rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">🛡️ פאנל ניהול</h1>
              <p className="text-gray-600 text-lg">ניהול ציוד והיסטוריית השאלות</p>
            </div>
            <div className="flex gap-3">
              <Link href="/">
                <Button
                  variant="outline"
                  className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold px-6 py-2 rounded-xl transition-all duration-200 hover:scale-105"
                >
                  <ArrowRight className="ml-2 h-4 w-4" />
                  חזרה לדף הראשי
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

        <div className="flex gap-3 mb-8">
          <Button
            onClick={() => setActiveTab('equipment')}
            className={`flex-1 py-6 rounded-xl font-semibold text-lg transition-all duration-300 ${
              activeTab === 'equipment'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50 scale-105'
                : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
            }`}
          >
            <span className="text-2xl ml-2">📦</span> ניהול ציוד
          </Button>
          <Button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-6 rounded-xl font-semibold text-lg transition-all duration-300 ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50 scale-105'
                : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
            }`}
          >
            <span className="text-2xl ml-2">📊</span> היסטוריית השאלות
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
                    className="w-32 h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-colors"
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
              <CardContent className="p-6">
                <div className="overflow-x-auto">
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
            <CardContent className="p-6">
              <div className="overflow-x-auto">
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
      </div>
    </div>
  )
}
