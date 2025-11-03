'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { City, CityForm } from '@/types'

export default function SuperAdminPage() {
  const [cities, setCities] = useState<City[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [superAdminPassword, setSuperAdminPassword] = useState<string>('')
  const [showAddCity, setShowAddCity] = useState(false)
  const [newCity, setNewCity] = useState<CityForm>({ name: '', manager_name: '', manager_phone: '', password: '' })
  const [editingCity, setEditingCity] = useState<City | null>(null)

  useEffect(() => {
    fetchSuperAdminPassword()
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchCities()
    }
  }, [isAuthenticated])

  const fetchSuperAdminPassword = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'super_admin_password')
        .single()

      if (error) {
        console.error('Error fetching super admin password:', error)
        setSuperAdminPassword('1234')
      } else {
        setSuperAdminPassword(data?.value || '1234')
      }
    } catch (error) {
      console.error('Error fetching super admin password:', error)
      setSuperAdminPassword('1234')
    }
  }

  const fetchCities = async () => {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching cities:', error)
    } else {
      setCities(data || [])
    }
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === superAdminPassword) {
      setIsAuthenticated(true)
      setPassword('')
    } else {
      alert('סיסמה שגויה')
    }
  }

  const handleAddCity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCity.name || !newCity.manager_name || !newCity.manager_phone || !newCity.password) {
      alert('אנא מלא את כל השדות')
      return
    }

    if (newCity.manager_phone.length !== 10) {
      alert('מספר טלפון חייב להיות בן 10 ספרות')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('cities')
        .insert([newCity])

      if (error) throw error

      alert('העיר נוספה בהצלחה!')
      setNewCity({ name: '', manager_name: '', manager_phone: '', password: '' })
      setShowAddCity(false)
      fetchCities()
    } catch (error) {
      console.error('Error adding city:', error)
      alert('אירעה שגיאה בהוספת העיר')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateCity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCity) return

    if (!editingCity.name || !editingCity.manager_name || !editingCity.manager_phone || !editingCity.password) {
      alert('אנא מלא את כל השדות')
      return
    }

    if (editingCity.manager_phone.length !== 10) {
      alert('מספר טלפון חייב להיות בן 10 ספרות')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('cities')
        .update({
          name: editingCity.name,
          manager_name: editingCity.manager_name,
          manager_phone: editingCity.manager_phone,
          password: editingCity.password,
          is_active: editingCity.is_active
        })
        .eq('id', editingCity.id)

      if (error) throw error

      alert('העיר עודכנה בהצלחה!')
      setEditingCity(null)
      fetchCities()
    } catch (error) {
      console.error('Error updating city:', error)
      alert('אירעה שגיאה בעדכון העיר')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (city: City) => {
    const action = city.is_active ? 'השבתת' : 'הפעלת'
    if (!confirm(`האם אתה בטוח שברצונך ב${action} העיר ${city.name}?`)) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('cities')
        .update({ is_active: !city.is_active })
        .eq('id', city.id)

      if (error) throw error

      alert(`העיר ${action}ה בהצלחה!`)
      fetchCities()
    } catch (error) {
      console.error('Error toggling city status:', error)
      alert(`אירעה שגיאה ב${action} העיר`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCity = async (city: City) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את העיר ${city.name}?\n\nאזהרה: פעולה זו תמחק גם את כל הציוד וההיסטוריה הקשורים לעיר!`)) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('cities')
        .delete()
        .eq('id', city.id)

      if (error) throw error

      alert('העיר נמחקה בהצלחה!')
      fetchCities()
    } catch (error) {
      console.error('Error deleting city:', error)
      alert('אירעה שגיאה במחיקת העיר')
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white pb-8">
            <div className="text-center">
              <div className="text-5xl mb-4">👑</div>
              <CardTitle className="text-3xl font-bold mb-2">כניסת מנהל על</CardTitle>
              <CardDescription className="text-purple-100 text-base">הזן סיסמת מנהל על לגישה למערכת</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">🔑 סיסמת מנהל על</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="הזן סיסמה"
                  className="h-12 border-2 border-gray-200 rounded-xl focus:border-purple-500 transition-colors"
                  required
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="submit"
                  className="flex-1 h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  ✅ כניסה למערכת
                </Button>
                <Link href="/" className="flex-1">
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <header className="bg-white/80 backdrop-blur-lg border border-gray-200/50 rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                👑 פאנל מנהל על
              </h1>
              <p className="text-gray-600 text-lg">ניהול מרכזי של כל הערים במערכת</p>
            </div>
            <div className="flex gap-3">
              <Link href="/">
                <Button
                  variant="outline"
                  className="border-2 border-purple-600 text-purple-600 hover:bg-purple-50 font-semibold px-6 py-2 rounded-xl transition-all duration-200 hover:scale-105"
                >
                  ↩️ חזרה לדף הבית
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

        {/* Add City Button */}
        <div className="mb-6">
          <Button
            onClick={() => setShowAddCity(!showAddCity)}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {showAddCity ? '❌ ביטול' : '➕ הוספת עיר חדשה'}
          </Button>
        </div>

        {/* Add City Form */}
        {showAddCity && (
          <Card className="mb-8 border-0 shadow-2xl rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 pb-4">
              <CardTitle className="text-xl font-bold text-gray-800">➕ הוספת עיר חדשה</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleAddCity} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">🏙️ שם העיר</label>
                    <Input
                      value={newCity.name}
                      onChange={(e) => setNewCity({ ...newCity, name: e.target.value })}
                      placeholder="לדוגמה: ירושלים"
                      className="h-12"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">👤 שם מנהל היחידה</label>
                    <Input
                      value={newCity.manager_name}
                      onChange={(e) => setNewCity({ ...newCity, manager_name: e.target.value })}
                      placeholder="לדוגמה: יוסי כהן"
                      className="h-12"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">📱 טלפון מנהל</label>
                    <Input
                      type="tel"
                      value={newCity.manager_phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '')
                        if (value.length <= 10) {
                          setNewCity({ ...newCity, manager_phone: value })
                        }
                      }}
                      placeholder="0501234567"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      className="h-12"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">🔐 סיסמת העיר</label>
                    <Input
                      type="password"
                      value={newCity.password}
                      onChange={(e) => setNewCity({ ...newCity, password: e.target.value })}
                      placeholder="הזן סיסמה"
                      className="h-12"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl"
                >
                  {loading ? '⏳ מוסיף...' : '✅ הוסף עיר'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Cities List */}
        <Card className="border-0 shadow-2xl rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 pb-6">
            <CardTitle className="text-2xl font-bold text-gray-800">🏙️ רשימת ערים ({cities.length})</CardTitle>
            <CardDescription className="text-gray-600">ניהול כל הערים במערכת</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {cities.map(city => (
                <div key={city.id} className={`p-6 rounded-xl border-2 transition-all ${city.is_active ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200' : 'bg-gray-100 border-gray-300'}`}>
                  {editingCity?.id === city.id ? (
                    <form onSubmit={handleUpdateCity} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          value={editingCity.name}
                          onChange={(e) => setEditingCity({ ...editingCity, name: e.target.value })}
                          placeholder="שם העיר"
                          required
                        />
                        <Input
                          value={editingCity.manager_name}
                          onChange={(e) => setEditingCity({ ...editingCity, manager_name: e.target.value })}
                          placeholder="שם מנהל"
                          required
                        />
                        <Input
                          type="tel"
                          value={editingCity.manager_phone}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '')
                            if (value.length <= 10) {
                              setEditingCity({ ...editingCity, manager_phone: value })
                            }
                          }}
                          placeholder="טלפון מנהל"
                          pattern="[0-9]{10}"
                          maxLength={10}
                          required
                        />
                        <Input
                          type="password"
                          value={editingCity.password}
                          onChange={(e) => setEditingCity({ ...editingCity, password: e.target.value })}
                          placeholder="סיסמה"
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={loading} className="flex-1 bg-green-500 hover:bg-green-600">
                          ✅ שמור
                        </Button>
                        <Button type="button" onClick={() => setEditingCity(null)} variant="outline" className="flex-1">
                          ❌ ביטול
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-800 mb-1">🏙️ {city.name}</h3>
                          <p className="text-gray-600">👤 מנהל: {city.manager_name}</p>
                          <p className="text-gray-600">📱 טלפון: {city.manager_phone}</p>
                          <p className="text-sm text-gray-500 mt-2">סיסמה: ••••••</p>
                        </div>
                        <div className={`px-4 py-2 rounded-lg font-bold ${city.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                          {city.is_active ? '✅ פעילה' : '❌ לא פעילה'}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setEditingCity(city)}
                          className="flex-1 bg-blue-500 hover:bg-blue-600"
                        >
                          ✏️ ערוך
                        </Button>
                        <Button
                          onClick={() => handleToggleActive(city)}
                          disabled={loading}
                          className={`flex-1 ${city.is_active ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'}`}
                        >
                          {city.is_active ? '🔴 השבת' : '🟢 הפעל'}
                        </Button>
                        <Button
                          onClick={() => handleDeleteCity(city)}
                          disabled={loading}
                          className="flex-1 bg-red-500 hover:bg-red-600"
                        >
                          🗑️ מחק
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
