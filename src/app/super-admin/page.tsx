'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { City, CityForm } from '@/types'
import Logo from '@/components/Logo'
import { loginSuperAdmin, checkAuth, logout } from '@/lib/auth'

export default function SuperAdminPage() {
  const [cities, setCities] = useState<City[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [superAdminPassword, setSuperAdminPassword] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'cities' | 'settings'>('cities')
  const [showAddCity, setShowAddCity] = useState(false)
  const [newCity, setNewCity] = useState<CityForm>({ name: '', manager1_name: '', manager1_phone: '', manager2_name: '', manager2_phone: '', location_url: '', password: '' })
  const [editingCity, setEditingCity] = useState<City | null>(null)
  const [changePasswordForm, setChangePasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showChangePassword, setShowChangePassword] = useState(false)

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    try {
      const result = await loginSuperAdmin(password)
      if (result.success) {
        setIsAuthenticated(true)
        setPassword('')
      } else {
        alert(result.error || 'סיסמה שגויה')
      }
    } catch (error) {
      console.error('Login error:', error)
      alert('שגיאה בתהליך ההתחברות')
    } finally {
      setLoading(false)
    }
  }

  // בדיקת אימות בטעינת הדף
  useEffect(() => {
    const verifyAuth = async () => {
      const { authenticated, userType } = await checkAuth()
      if (authenticated && userType === 'super') {
        setIsAuthenticated(true)
      }
    }
    verifyAuth()
  }, [])

  const handleAddCity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCity.name || !newCity.manager1_name || !newCity.manager1_phone || !newCity.password) {
      alert('אנא מלא את כל השדות החובה (שם עיר, מנהל ראשון, טלפון, סיסמה)')
      return
    }

    if (newCity.manager1_phone.length !== 10) {
      alert('טלפון מנהל ראשון חייב להיות בן 10 ספרות')
      return
    }

    if (newCity.manager2_phone && newCity.manager2_phone.length !== 10) {
      alert('טלפון מנהל שני חייב להיות בן 10 ספרות (או השאר ריק)')
      return
    }

    setLoading(true)
    try {
      const cityData = {
        name: newCity.name,
        manager1_name: newCity.manager1_name,
        manager1_phone: newCity.manager1_phone,
        manager2_name: newCity.manager2_name || null,
        manager2_phone: newCity.manager2_phone || null,
        location_url: newCity.location_url || null,
        password: newCity.password,
        is_active: true
      }

      const { error } = await supabase
        .from('cities')
        .insert([cityData])

      if (error) throw error

      alert('העיר נוספה בהצלחה!')
      setNewCity({ name: '', manager1_name: '', manager1_phone: '', manager2_name: '', manager2_phone: '', location_url: '', password: '' })
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

    if (!editingCity.name || !editingCity.manager1_name || !editingCity.manager1_phone || !editingCity.password) {
      alert('אנא מלא את כל השדות החובה (שם עיר, מנהל ראשון, טלפון, סיסמה)')
      return
    }

    if (editingCity.manager1_phone.length !== 10) {
      alert('טלפון מנהל ראשון חייב להיות בן 10 ספרות')
      return
    }

    if (editingCity.manager2_phone && editingCity.manager2_phone.length !== 10) {
      alert('טלפון מנהל שני חייב להיות בן 10 ספרות (או השאר ריק)')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('cities')
        .update({
          name: editingCity.name,
          manager1_name: editingCity.manager1_name,
          manager1_phone: editingCity.manager1_phone,
          manager2_name: editingCity.manager2_name || null,
          manager2_phone: editingCity.manager2_phone || null,
          location_url: editingCity.location_url || null,
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (changePasswordForm.currentPassword !== superAdminPassword) {
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
        .from('settings')
        .update({ value: changePasswordForm.newPassword })
        .eq('key', 'super_admin_password')

      if (error) throw error

      alert('הסיסמה שונתה בהצלחה!')
      setSuperAdminPassword(changePasswordForm.newPassword)
      setChangePasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setShowChangePassword(false)
    } catch (error) {
      console.error('Error changing password:', error)
      alert('אירעה שגיאה בשינוי הסיסמה')
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen content-wrapper flex items-center justify-center p-4">
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
          <Logo />
        </div>
        <Card className="w-full max-w-md border-0 shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white pb-8">
            <div className="text-center">
              <div className="text-5xl mb-4">👑</div>
              <CardTitle className="text-3xl font-bold mb-2">ממשק ניהול מרכזי</CardTitle>
              <CardDescription className="text-purple-100 text-base">הזן סיסמת מנהל לגישה למערכת</CardDescription>
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
    <div className="min-h-screen content-wrapper">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Logo */}
        <Logo />
        <header className="bg-white/80 backdrop-blur-lg border border-gray-200/50 rounded-2xl shadow-xl p-8 mb-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              👑 ממשק ניהול מרכזי
            </h1>
            <p className="text-gray-600 text-lg mb-4">ניהול מרכזי של כל הערים במערכת</p>
            <div className="flex gap-2 justify-center">
              <Link href="/">
                <Button
                  variant="outline"
                  className="border-2 border-purple-600 text-purple-600 hover:bg-purple-50 font-semibold px-4 py-1.5 text-sm rounded-lg transition-all duration-200 hover:scale-105"
                >
                  ↩️ חזרה לדף הבית
                </Button>
              </Link>
              <Button
                onClick={async () => {
                  await logout()
                  setIsAuthenticated(false)
                }}
                className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-semibold px-4 py-1.5 text-sm rounded-lg transition-all duration-200 hover:scale-105"
              >
                🚪 יציאה
              </Button>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          <Button
            onClick={() => setActiveTab('cities')}
            className={`py-6 rounded-xl font-semibold text-lg transition-all duration-300 ${
              activeTab === 'cities'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50 scale-105'
                : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
            }`}
          >
            <span className="text-2xl ml-2">🏙️</span> ניהול ערים
          </Button>
          <Button
            onClick={() => setActiveTab('settings')}
            className={`py-6 rounded-xl font-semibold text-lg transition-all duration-300 ${
              activeTab === 'settings'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50 scale-105'
                : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
            }`}
          >
            <span className="text-2xl ml-2">⚙️</span> הגדרות
          </Button>
        </div>

        {activeTab === 'cities' && (
          <>
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
                  <div className="space-y-2 md:col-span-2">
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
                    <label className="block text-sm font-semibold text-gray-700">👤 מנהל ראשון - שם</label>
                    <Input
                      value={newCity.manager1_name}
                      onChange={(e) => setNewCity({ ...newCity, manager1_name: e.target.value })}
                      placeholder="לדוגמה: יוסי כהן"
                      className="h-12"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">📱 מנהל ראשון - טלפון</label>
                    <Input
                      type="tel"
                      value={newCity.manager1_phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '')
                        if (value.length <= 10) {
                          setNewCity({ ...newCity, manager1_phone: value })
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
                    <label className="block text-sm font-semibold text-gray-700">👤 מנהל שני - שם <span className="text-gray-400 text-xs">(אופציונלי)</span></label>
                    <Input
                      value={newCity.manager2_name}
                      onChange={(e) => setNewCity({ ...newCity, manager2_name: e.target.value })}
                      placeholder="לדוגמה: דוד לוי"
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">📱 מנהל שני - טלפון <span className="text-gray-400 text-xs">(אופציונלי)</span></label>
                    <Input
                      type="tel"
                      value={newCity.manager2_phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '')
                        if (value.length <= 10) {
                          setNewCity({ ...newCity, manager2_phone: value })
                        }
                      }}
                      placeholder="0507654321"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700">📍 קישור Google Maps למיקום הארון <span className="text-gray-400 text-xs">(אופציונלי)</span></label>
                    <Input
                      type="url"
                      value={newCity.location_url}
                      onChange={(e) => setNewCity({ ...newCity, location_url: e.target.value })}
                      placeholder="https://maps.google.com/?q=31.7683,35.2137"
                      className="h-12"
                    />
                    <p className="text-xs text-gray-500">💡 פתח Google Maps, לחץ ארוך על המיקום, והעתק את הקישור</p>
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
                        <div className="md:col-span-2">
                          <Input
                            value={editingCity.name}
                            onChange={(e) => setEditingCity({ ...editingCity, name: e.target.value })}
                            placeholder="שם העיר"
                            required
                          />
                        </div>
                        <Input
                          value={editingCity.manager1_name}
                          onChange={(e) => setEditingCity({ ...editingCity, manager1_name: e.target.value })}
                          placeholder="מנהל 1 - שם"
                          required
                        />
                        <Input
                          type="tel"
                          value={editingCity.manager1_phone}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '')
                            if (value.length <= 10) {
                              setEditingCity({ ...editingCity, manager1_phone: value })
                            }
                          }}
                          placeholder="מנהל 1 - טלפון"
                          pattern="[0-9]{10}"
                          maxLength={10}
                          required
                        />
                        <Input
                          value={editingCity.manager2_name || ''}
                          onChange={(e) => setEditingCity({ ...editingCity, manager2_name: e.target.value })}
                          placeholder="מנהל 2 - שם (אופציונלי)"
                        />
                        <Input
                          type="tel"
                          value={editingCity.manager2_phone || ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '')
                            if (value.length <= 10) {
                              setEditingCity({ ...editingCity, manager2_phone: value })
                            }
                          }}
                          placeholder="מנהל 2 - טלפון (אופציונלי)"
                          pattern="[0-9]{10}"
                          maxLength={10}
                        />
                        <div className="md:col-span-2">
                          <Input
                            type="url"
                            value={editingCity.location_url || ''}
                            onChange={(e) => setEditingCity({ ...editingCity, location_url: e.target.value })}
                            placeholder="📍 קישור Google Maps (אופציונלי)"
                          />
                        </div>
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
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-gray-800 mb-3">🏙️ {city.name}</h3>
                          <div className="space-y-2">
                            {/* Manager 1 */}
                            <div className="flex items-center gap-3 bg-white rounded-lg p-2 border border-gray-200">
                              <span className="text-lg">👤</span>
                              <div className="flex-1">
                                <p className="font-semibold text-gray-800">{city.manager1_name}</p>
                                <p className="text-sm text-gray-600">📱 {city.manager1_phone}</p>
                              </div>
                            </div>
                            {/* Manager 2 - Only show if exists */}
                            {city.manager2_name && city.manager2_phone && (
                              <div className="flex items-center gap-3 bg-white rounded-lg p-2 border border-gray-200">
                                <span className="text-lg">👤</span>
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-800">{city.manager2_name}</p>
                                  <p className="text-sm text-gray-600">📱 {city.manager2_phone}</p>
                                </div>
                              </div>
                            )}
                            {/* Location Link */}
                            {city.location_url && (
                              <a
                                href={city.location_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 bg-white rounded-lg p-2 border border-gray-200 hover:bg-gray-50 transition-colors"
                              >
                                <span className="text-lg">📍</span>
                                <p className="font-semibold text-blue-600">מיקום הארון במפה</p>
                              </a>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-3">🔐 סיסמה: ••••••</p>
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
          </>
        )}

        {activeTab === 'settings' && (
          <Card className="border-0 shadow-2xl rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 pb-6">
              <CardTitle className="text-2xl font-bold text-gray-800">⚙️ הגדרות מערכת</CardTitle>
              <CardDescription className="text-gray-600">ניהול הגדרות אבטחה ומערכת</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {!showChangePassword ? (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">🔐 סיסמת מנהל על</h3>
                        <p className="text-sm text-gray-600">שנה את סיסמת הכניסה לפאנל מנהל על</p>
                      </div>
                      <Button
                        onClick={() => setShowChangePassword(true)}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105"
                      >
                        שנה סיסמה
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-gray-800">שינוי סיסמת מנהל על</CardTitle>
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
                            className="h-12 border-2 border-gray-200 rounded-xl focus:border-purple-500 transition-colors"
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
                            className="h-12 border-2 border-gray-200 rounded-xl focus:border-purple-500 transition-colors"
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
                            className="h-12 border-2 border-gray-200 rounded-xl focus:border-purple-500 transition-colors"
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
                        <li>• סיסמה זו שולטת בגישה לכל המערכת!</li>
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
  )
}
