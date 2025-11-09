'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { Equipment, BorrowHistory, City } from '@/types'
import { ArrowRight, FileDown } from 'lucide-react'
import * as XLSX from 'xlsx'
import Logo from '@/components/Logo'
import { loginCity, checkAuth, logout } from '@/lib/auth'
import RequestsTab from '@/components/RequestsTab'

export default function CityAdminPage() {
  const params = useParams()
  const cityId = params.cityId as string

  const [city, setCity] = useState<City | null>(null)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [borrowHistory, setBorrowHistory] = useState<BorrowHistory[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'equipment' | 'history' | 'requests' | 'settings'>('equipment')
  const [newEquipment, setNewEquipment] = useState({ name: '', quantity: 1, equipment_status: 'working' as 'working' | 'faulty', is_consumable: false })
  const [editingEquipment, setEditingEquipment] = useState<{ id: string; name: string; quantity: number; equipment_status: 'working' | 'faulty'; is_consumable: boolean } | null>(null)
  const [changePasswordForm, setChangePasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [editCityForm, setEditCityForm] = useState({
    manager1_name: '',
    manager1_phone: '',
    manager2_name: '',
    manager2_phone: '',
    location_url: ''
  })
  const [allCities, setAllCities] = useState<City[]>([])
  const [selectedCityToCopy, setSelectedCityToCopy] = useState<string>('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordFields, setShowPasswordFields] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [showCopyEquipment, setShowCopyEquipment] = useState(false)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (cityId) {
      fetchCity()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityId])

  useEffect(() => {
    if (isAuthenticated && cityId) {
      fetchData()
      fetchAllCities()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // Initialize edit form with current city data
        setEditCityForm({
          manager1_name: data.manager1_name || '',
          manager1_phone: data.manager1_phone || '',
          manager2_name: data.manager2_name || '',
          manager2_phone: data.manager2_phone || '',
          location_url: data.location_url || ''
        })
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

  const fetchAllCities = async () => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.error('Error fetching cities:', error)
      } else {
        // Filter out current city
        setAllCities((data || []).filter(c => c.id !== cityId))
      }
    } catch (error) {
      console.error('Error fetching cities:', error)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!city) {
      alert('שגיאה בטעינת נתוני העיר')
      return
    }

    setLoading(true)
    try {
      const result = await loginCity(cityId, password)
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
      const { authenticated, userId } = await checkAuth()
      if (authenticated && userId === cityId) {
        setIsAuthenticated(true)
      }
    }
    verifyAuth()
  }, [cityId])

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!city) {
      alert('שגיאה בטעינת נתוני העיר')
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
      const response = await fetch('/api/city/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cityId: cityId,
          currentPassword: changePasswordForm.currentPassword,
          newPassword: changePasswordForm.newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'שגיאה בשינוי הסיסמה')
        return
      }

      alert('הסיסמה שונתה בהצלחה!')
      setChangePasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setShowChangePassword(false)
      fetchCity()
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
          city_id: cityId,
          equipment_status: newEquipment.equipment_status,
          is_consumable: newEquipment.is_consumable
        })

      if (error) throw error

      alert('הציוד נוסף בהצלחה!')
      setNewEquipment({ name: '', quantity: 1, equipment_status: 'working', is_consumable: false })
      fetchEquipment()
    } catch (error) {
      console.error('Error adding equipment:', error)
      alert('אירעה שגיאה בהוספת הציוד')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateEquipment = async (id: string, name: string, quantity: number, equipment_status: 'working' | 'faulty', is_consumable: boolean) => {
    if (!name || quantity < 0) {
      alert('אנא מלא שם וכמות תקינים')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('equipment')
        .update({ name, quantity, equipment_status, is_consumable })
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
      // Get the borrow record to find the equipment_id
      const { data: borrowRecord, error: fetchError } = await supabase
        .from('borrow_history')
        .select('*, equipment_id')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      const updateData: any = { status }
      if (status === 'returned') {
        updateData.return_date = new Date().toISOString()
      }

      const { error } = await supabase
        .from('borrow_history')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      // If status changed to 'returned', increment equipment quantity
      if (status === 'returned' && borrowRecord.equipment_id) {
        const equipmentItem = equipment.find(eq => eq.id === borrowRecord.equipment_id)
        if (equipmentItem) {
          const { error: qtyUpdateError } = await supabase
            .from('equipment')
            .update({ quantity: equipmentItem.quantity + 1 })
            .eq('id', borrowRecord.equipment_id)

          if (qtyUpdateError) throw qtyUpdateError
        }
      }

      // If status changed to 'borrowed', decrement equipment quantity
      if (status === 'borrowed' && borrowRecord.equipment_id && borrowRecord.status === 'returned') {
        const equipmentItem = equipment.find(eq => eq.id === borrowRecord.equipment_id)
        if (equipmentItem && equipmentItem.quantity > 0) {
          const { error: qtyUpdateError } = await supabase
            .from('equipment')
            .update({ quantity: equipmentItem.quantity - 1 })
            .eq('id', borrowRecord.equipment_id)

          if (qtyUpdateError) throw qtyUpdateError
        }
      }

      fetchHistory()
      fetchEquipment() // Refresh equipment to show updated quantity
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
      'תאריך השאלה': new Date(item.borrow_date).toLocaleDateString('he-IL'),
      'תאריך החזרה': item.return_date ? new Date(item.return_date).toLocaleDateString('he-IL') : 'טרם הוחזר',
      'סטטוס': item.status === 'borrowed' ? 'מושאל' : 'הוחזר',
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

  const handleUpdateCityDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!city) return

    // Validation
    if (!editCityForm.manager1_name.trim() || !editCityForm.manager1_phone.trim()) {
      alert('שם וטלפון מנהל ראשון הם שדות חובה')
      return
    }

    if (editCityForm.manager1_phone.length !== 10 || !/^05\d{8}$/.test(editCityForm.manager1_phone)) {
      alert('מספר טלפון מנהל ראשון חייב להיות בן 10 ספרות ולהתחיל ב-05')
      return
    }

    if (editCityForm.manager2_phone && (editCityForm.manager2_phone.length !== 10 || !/^05\d{8}$/.test(editCityForm.manager2_phone))) {
      alert('מספר טלפון מנהל שני חייב להיות בן 10 ספרות ולהתחיל ב-05')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/city/update-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cityId: cityId,
          manager1_name: editCityForm.manager1_name.trim(),
          manager1_phone: editCityForm.manager1_phone.trim(),
          manager2_name: editCityForm.manager2_name.trim() || null,
          manager2_phone: editCityForm.manager2_phone.trim() || null,
          location_url: editCityForm.location_url.trim() || null
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'שגיאה בעדכון הפרטים')
        return
      }

      alert('הפרטים עודכנו בהצלחה!')
      fetchCity()
    } catch (error) {
      console.error('Error updating city details:', error)
      alert('אירעה שגיאה בעדכון הפרטים')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyEquipmentFromCity = async () => {
    if (!selectedCityToCopy) {
      alert('אנא בחר עיר להעתקת הציוד ממנה')
      return
    }

    if (!confirm('האם אתה בטוח שברצונך להעתיק את הציוד? הציוד הקיים ישאר כמו שהוא ויתווספו פריטים חדשים.')) {
      return
    }

    setLoading(true)
    try {
      // Fetch equipment from selected city
      const { data: sourceEquipment, error: fetchError } = await supabase
        .from('equipment')
        .select('name, quantity, equipment_status, is_consumable')
        .eq('city_id', selectedCityToCopy)

      if (fetchError) throw fetchError

      if (!sourceEquipment || sourceEquipment.length === 0) {
        alert('העיר שנבחרה אין בה ציוד להעתקה')
        setLoading(false)
        return
      }

      // Get existing equipment names in current city to avoid duplicates
      const existingNames = equipment.map(e => e.name.toLowerCase())

      // Filter out equipment that already exists
      const newEquipment = sourceEquipment.filter(
        item => !existingNames.includes(item.name.toLowerCase())
      )

      if (newEquipment.length === 0) {
        alert('כל הציוד מהעיר שנבחרה כבר קיים בעיר שלך')
        setLoading(false)
        return
      }

      // Prepare equipment data with current city_id
      const equipmentToInsert = newEquipment.map(item => ({
        name: item.name,
        quantity: item.quantity,
        equipment_status: item.equipment_status || 'working',
        is_consumable: item.is_consumable || false,
        city_id: cityId
      }))

      // Insert new equipment
      const { error: insertError } = await supabase
        .from('equipment')
        .insert(equipmentToInsert)

      if (insertError) throw insertError

      alert(`הצלחה! ${newEquipment.length} פריטי ציוד הועתקו בהצלחה`)
      setShowCopyEquipment(false)
      setSelectedCityToCopy('')
      fetchEquipment()
    } catch (error) {
      console.error('Error copying equipment:', error)
      alert('אירעה שגיאה בהעתקת הציוד')
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
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="הזן סיסמה"
                    className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-colors pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
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
    <div className="min-h-screen content-wrapper">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Logo */}
        <Logo />

        <header className="bg-white/90 backdrop-blur-lg border border-gray-200/50 rounded-2xl shadow-xl p-4 sm:p-8 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-right">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                🛡️ פאנל ניהול - {city?.name}
              </h1>
              <p className="text-gray-600 text-lg">ניהול ציוד והיסטוריית השאלות</p>
            </div>
            <div className="hidden sm:flex gap-3">
              <a href="/user-guide-city-admin.html" target="_blank" rel="noopener noreferrer">
                <Button
                  variant="outline"
                  className="border-2 border-purple-500 text-purple-600 hover:bg-purple-50 font-semibold px-6 py-2 rounded-xl transition-all duration-200 hover:scale-105"
                >
                  📚 מדריך מנהל
                </Button>
              </a>
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
                onClick={async () => {
                  await logout()
                  setIsAuthenticated(false)
                }}
                className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-semibold px-6 py-2 rounded-xl transition-all duration-200 hover:scale-105"
              >
                🚪 יציאה
              </Button>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Buttons - Below Header */}
        <div className="sm:hidden flex flex-col gap-3 mb-6">
          <a href="/user-guide-city-admin.html" target="_blank" rel="noopener noreferrer" className="w-full">
            <Button
              variant="outline"
              className="w-full h-14 rounded-xl border-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50 text-purple-600 font-semibold text-lg transition-all"
            >
              📚 מדריך מנהל עיר
            </Button>
          </a>
          <div className="flex gap-3">
            <Link href={`/city/${cityId}`} className="flex-1">
              <Button
                variant="outline"
                className="w-full h-14 rounded-xl border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 text-blue-600 font-semibold text-lg transition-all"
              >
                ↩️ חזרה
              </Button>
            </Link>
            <Button
              onClick={async () => {
                await logout()
                setIsAuthenticated(false)
              }}
              className="flex-1 h-14 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-semibold text-lg transition-all"
            >
              🚪 יציאה
            </Button>
          </div>
        </div>

        {/* Export Button */}
        <div className="mb-6 flex gap-3 justify-center">
          <Button
            onClick={handleExportToExcel}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            <FileDown className="ml-2 h-5 w-5" />
            ייצוא לאקסל
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
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
          {city?.request_mode === 'request' && (
            <Button
              onClick={() => setActiveTab('requests')}
              className={`py-6 rounded-xl font-semibold text-lg transition-all duration-300 ${
                activeTab === 'requests'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50 scale-105'
                  : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
              }`}
            >
              <span className="text-2xl ml-2">📝</span> בקשות
            </Button>
          )}
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
                <form onSubmit={handleAddEquipment} className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row gap-4">
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
                      className="w-full sm:w-20 h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-colors"
                    />
                    <select
                      value={newEquipment.equipment_status}
                      onChange={(e) => setNewEquipment({ ...newEquipment, equipment_status: e.target.value as 'working' | 'faulty' })}
                      className="w-full sm:w-32 h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-colors px-3 text-sm font-medium"
                    >
                      <option value="working">✅ תקין</option>
                      <option value="faulty">⚠️ תקול</option>
                    </select>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-12 px-8 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                    >
                      ✅ הוסף
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 pr-2">
                    <input
                      type="checkbox"
                      id="is_consumable"
                      checked={newEquipment.is_consumable}
                      onChange={(e) => setNewEquipment({ ...newEquipment, is_consumable: e.target.checked })}
                      className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="is_consumable" className="text-sm font-semibold text-gray-700 cursor-pointer">
                      🔄 ציוד מתכלה (לא דורש החזרה)
                    </label>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Low Stock Alerts for Consumable Equipment - Compact Version */}
            {equipment.filter(item => item.is_consumable && item.quantity <= 3 && !dismissedAlerts.has(item.id)).length > 0 && (
              <div className="mb-4 p-3 bg-gradient-to-r from-orange-50 to-amber-50 border-l-4 border-orange-500 rounded-lg shadow-md">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⚠️</span>
                    <h3 className="font-bold text-orange-800 text-sm">
                      התראות מלאי נמוך ({equipment.filter(item => item.is_consumable && item.quantity <= 3 && !dismissedAlerts.has(item.id)).length})
                    </h3>
                  </div>
                  <div className="flex items-center gap-1">
                    {city?.manager1_phone && (
                      <a
                        href={`https://wa.me/972${city.manager1_phone.substring(1)}?text=${encodeURIComponent(
                          `⚠️ התראת מלאי נמוך - ${city.name}\n\n` +
                          equipment
                            .filter(item => item.is_consumable && item.quantity <= 3 && !dismissedAlerts.has(item.id))
                            .map(item => `• ${item.name}: ${item.quantity === 0 ? 'אזל המלאי!' : `נותרו ${item.quantity} יחידות`}`)
                            .join('\n') +
                          '\n\nמומלץ לחדש מלאי בהקדם.'
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-6 px-2 text-xs bg-green-500 hover:bg-green-600 text-white rounded flex items-center gap-1 transition-colors"
                      >
                        📱 שלח ל-WhatsApp
                      </a>
                    )}
                    <Button
                      onClick={() => {
                        const newDismissed = new Set(dismissedAlerts)
                        equipment
                          .filter(item => item.is_consumable && item.quantity <= 3)
                          .forEach(item => newDismissed.add(item.id))
                        setDismissedAlerts(newDismissed)
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-orange-700 hover:text-orange-900 hover:bg-orange-100"
                    >
                      ✕ סגור הכל
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {equipment
                    .filter(item => item.is_consumable && item.quantity <= 3 && !dismissedAlerts.has(item.id))
                    .map(item => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                          item.quantity === 0
                            ? 'bg-red-50 border-red-200'
                            : 'bg-yellow-50 border-yellow-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-lg">
                            {item.quantity === 0 ? '🚨' : '⚠️'}
                          </span>
                          <div className="flex-1">
                            <p className="font-semibold text-sm text-gray-800">{item.name}</p>
                            <p className={`text-xs ${
                              item.quantity === 0 ? 'text-red-700' : 'text-orange-700'
                            }`}>
                              {item.quantity === 0
                                ? 'אזל המלאי'
                                : `נותרו ${item.quantity} יח'`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            onClick={() => setEditingEquipment({
                              id: item.id,
                              name: item.name,
                              quantity: item.quantity,
                              equipment_status: item.equipment_status,
                              is_consumable: item.is_consumable
                            })}
                            size="sm"
                            className="h-7 px-2 text-xs bg-blue-500 hover:bg-blue-600 text-white"
                          >
                            ➕ הוסף
                          </Button>
                          <Button
                            onClick={() => {
                              const newDismissed = new Set(dismissedAlerts)
                              newDismissed.add(item.id)
                              setDismissedAlerts(newDismissed)
                            }}
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                          >
                            ✕
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
                <p className="text-xs text-gray-600 mt-2 pl-7">
                  💡 כל לקיחה מורידה יחידה בודדת מהמלאי, לא כל המארז
                </p>
              </div>
            )}

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
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">🔧 סטטוס</label>
                            <select
                              value={editingEquipment.equipment_status}
                              onChange={(e) => setEditingEquipment({ ...editingEquipment, equipment_status: e.target.value as 'working' | 'faulty' })}
                              className="w-full h-12 border-2 border-blue-300 rounded-lg px-3 text-base font-medium"
                            >
                              <option value="working">✅ תקין</option>
                              <option value="faulty">⚠️ תקול</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-2 pr-2">
                            <input
                              type="checkbox"
                              id={`edit_consumable_${item.id}`}
                              checked={editingEquipment.is_consumable}
                              onChange={(e) => setEditingEquipment({ ...editingEquipment, is_consumable: e.target.checked })}
                              className="w-5 h-5 rounded border-2 border-blue-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor={`edit_consumable_${item.id}`} className="text-sm font-semibold text-gray-700 cursor-pointer">
                              🔄 ציוד מתכלה
                            </label>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleUpdateEquipment(item.id, editingEquipment.name, editingEquipment.quantity, editingEquipment.equipment_status, editingEquipment.is_consumable)}
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
                              <p className={`text-sm font-semibold mt-1 ${item.equipment_status === 'working' ? 'text-green-600' : 'text-orange-600'}`}>
                                {item.equipment_status === 'working' ? '✅ תקין' : '⚠️ תקול'}
                              </p>
                              {item.is_consumable && (
                                <p className="text-xs font-semibold mt-1 text-purple-600">
                                  🔄 ציוד מתכלה
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => setEditingEquipment({ id: item.id, name: item.name, quantity: item.quantity, equipment_status: item.equipment_status, is_consumable: item.is_consumable })}
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
                        <th className="text-center p-4 font-bold text-gray-700">🎯 שם הציוד</th>
                        <th className="text-center p-4 font-bold text-gray-700">🔢 כמות</th>
                        <th className="text-center p-4 font-bold text-gray-700">🔧 סטטוס</th>
                        <th className="text-center p-4 font-bold text-gray-700">🔄 מתכלה</th>
                        <th className="text-center p-4 font-bold text-gray-700">⚙️ פעולות</th>
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
                            {editingEquipment?.id === item.id ? (
                              <select
                                value={editingEquipment.equipment_status}
                                onChange={(e) => setEditingEquipment({ ...editingEquipment, equipment_status: e.target.value as 'working' | 'faulty' })}
                                className="w-32 h-10 border-2 border-blue-300 rounded-lg px-2 text-sm font-medium"
                              >
                                <option value="working">✅ תקין</option>
                                <option value="faulty">⚠️ תקול</option>
                              </select>
                            ) : (
                              <span className={`font-semibold text-sm ${
                                item.equipment_status === 'working' ? 'text-green-600' : 'text-orange-600'
                              }`}>
                                {item.equipment_status === 'working' ? '✅ תקין' : '⚠️ תקול'}
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            {editingEquipment?.id === item.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={editingEquipment.is_consumable}
                                  onChange={(e) => setEditingEquipment({ ...editingEquipment, is_consumable: e.target.checked })}
                                  className="w-4 h-4 rounded border-2 border-blue-300 text-blue-600 focus:ring-blue-500"
                                />
                              </div>
                            ) : (
                              <span className={`text-sm font-semibold ${item.is_consumable ? 'text-purple-600' : 'text-gray-400'}`}>
                                {item.is_consumable ? '✓ כן' : '—'}
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              {editingEquipment?.id === item.id ? (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateEquipment(item.id, editingEquipment.name, editingEquipment.quantity, editingEquipment.equipment_status, editingEquipment.is_consumable)}
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
                                    onClick={() => setEditingEquipment({ id: item.id, name: item.name, quantity: item.quantity, equipment_status: item.equipment_status, is_consumable: item.is_consumable })}
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

        {activeTab === 'requests' && city && (
          <RequestsTab
            cityId={cityId}
            cityName={city.name}
            managerName={city.manager1_name}
          />
        )}

        {activeTab === 'settings' && (
          <Card className="border-0 shadow-2xl rounded-2xl overflow-hidden bg-white/90 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-6">
              <CardTitle className="text-2xl font-bold text-gray-800">⚙️ הגדרות מערכת</CardTitle>
              <CardDescription className="text-gray-600">ניהול הגדרות אבטחה ומערכת</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Request Mode Settings */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">🎯 מצב פעולה של המערכת</h3>
                  <p className="text-sm text-gray-600 mb-4">בחר כיצד משתמשים ישאלו ציוד מהארון</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Direct Mode */}
                    <button
                      onClick={async () => {
                        if (city?.request_mode === 'direct') {
                          alert('המערכת כבר במצב השאלה ישירה')
                          return
                        }

                        if (confirm('האם להחליף למצב השאלה ישירה? משתמשים יוכלו לשאול ציוד מיידית ללא אישור')) {
                          try {
                            const response = await fetch('/api/city/update-details', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                cityId,
                                manager1_name: city?.manager1_name,
                                manager1_phone: city?.manager1_phone,
                                manager2_name: city?.manager2_name,
                                manager2_phone: city?.manager2_phone,
                                location_url: city?.location_url,
                                request_mode: 'direct'
                              })
                            })

                            const data = await response.json()

                            if (!response.ok) {
                              throw new Error(data.error || 'שגיאה בעדכון')
                            }

                            alert('✅ המצב עודכן להשאלה ישירה')
                            await fetchCity()
                            window.location.reload()
                          } catch (error: any) {
                            console.error('Update error:', error)
                            alert('שגיאה בעדכון: ' + error.message)
                          }
                        }
                      }}
                      className={`p-6 rounded-xl border-2 font-semibold transition-all text-right ${
                        city?.request_mode === 'direct'
                          ? 'bg-green-100 border-green-500 shadow-lg scale-105'
                          : 'bg-white border-gray-300 hover:border-green-300'
                      }`}
                    >
                      <div className="text-4xl mb-2">⚡</div>
                      <div className="text-xl font-bold mb-2">השאלה ישירה</div>
                      <div className="text-sm text-gray-600">
                        משתמשים שואלים ציוד מיידית ללא צורך באישור מנהל
                      </div>
                      {city?.request_mode === 'direct' && (
                        <div className="mt-3 text-green-600 font-bold">✓ פעיל כעת</div>
                      )}
                    </button>

                    {/* Request Mode */}
                    <button
                      onClick={async () => {
                        if (city?.request_mode === 'request') {
                          alert('המערכת כבר במצב בקשות')
                          return
                        }

                        if (confirm('האם להחליף למצב בקשות? משתמשים ישלחו בקשות שידרשו אישור מנהל')) {
                          try {
                            const response = await fetch('/api/city/update-details', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                cityId,
                                manager1_name: city?.manager1_name,
                                manager1_phone: city?.manager1_phone,
                                manager2_name: city?.manager2_name,
                                manager2_phone: city?.manager2_phone,
                                location_url: city?.location_url,
                                request_mode: 'request'
                              })
                            })

                            const data = await response.json()

                            if (!response.ok) {
                              throw new Error(data.error || 'שגיאה בעדכון')
                            }

                            alert('✅ המצב עודכן למצב בקשות')
                            await fetchCity()
                            window.location.reload()
                          } catch (error: any) {
                            console.error('Update error:', error)
                            alert('שגיאה בעדכון: ' + error.message)
                          }
                        }
                      }}
                      className={`p-6 rounded-xl border-2 font-semibold transition-all text-right ${
                        city?.request_mode === 'request'
                          ? 'bg-purple-100 border-purple-500 shadow-lg scale-105'
                          : 'bg-white border-gray-300 hover:border-purple-300'
                      }`}
                    >
                      <div className="text-4xl mb-2">📝</div>
                      <div className="text-xl font-bold mb-2">מצב בקשות</div>
                      <div className="text-sm text-gray-600">
                        משתמשים שולחים בקשות עם טוקן - מנהל מאשר/דוחה
                      </div>
                      {city?.request_mode === 'request' && (
                        <div className="mt-3 text-purple-600 font-bold">✓ פעיל כעת</div>
                      )}
                    </button>
                  </div>

                  {/* Request Mode Additional Settings */}
                  {city?.request_mode === 'request' && (
                    <div className="bg-white rounded-xl p-6 border-2 border-purple-200 space-y-4">
                      <h4 className="font-bold text-gray-800 mb-3">הגדרות נוספות למצב בקשות</h4>

                      {/* Cabinet Code */}
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">🔐 קוד ארון (אופציונלי)</label>
                        <p className="text-xs text-gray-500 mb-2">קוד זה יוצג למבקש רק לאחר שהבקשה אושרה</p>
                        <Input
                          type="text"
                          value={city.cabinet_code || ''}
                          onChange={(e) => {
                            // Update local state immediately
                            setCity({ ...city, cabinet_code: e.target.value })
                          }}
                          onBlur={async (e) => {
                            // Save to server when user finishes editing
                            try {
                              const response = await fetch('/api/city/update-details', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  cityId,
                                  manager1_name: city?.manager1_name,
                                  manager1_phone: city?.manager1_phone,
                                  manager2_name: city?.manager2_name,
                                  manager2_phone: city?.manager2_phone,
                                  location_url: city?.location_url,
                                  cabinet_code: e.target.value || null
                                })
                              })

                              if (!response.ok) {
                                alert('שגיאה בעדכון קוד ארון')
                                fetchCity() // Revert to server value
                              }
                            } catch (error) {
                              console.error('Error updating cabinet code:', error)
                              alert('שגיאה בעדכון קוד ארון')
                              fetchCity() // Revert to server value
                            }
                          }}
                          placeholder="לדוגמה: 1234"
                          className="h-12 border-2 border-gray-200 rounded-xl"
                        />
                      </div>

                      {/* Require Call ID */}
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                          <div className="font-semibold text-gray-800">🆔 לדרוש מזהה קריאה</div>
                          <div className="text-sm text-gray-500">האם להצריך מבקשים למלא מזהה קריאה</div>
                        </div>
                        <button
                          onClick={async () => {
                            const newValue = !city.require_call_id

                            // Update local state immediately for instant feedback
                            setCity({ ...city, require_call_id: newValue })

                            try {
                              const response = await fetch('/api/city/update-details', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  cityId,
                                  manager1_name: city?.manager1_name,
                                  manager1_phone: city?.manager1_phone,
                                  manager2_name: city?.manager2_name,
                                  manager2_phone: city?.manager2_phone,
                                  location_url: city?.location_url,
                                  require_call_id: newValue
                                })
                              })

                              if (response.ok) {
                                alert(newValue ? '✅ מזהה קריאה חובה' : '❌ מזהה קריאה אופציונלי')
                              } else {
                                // Revert on error
                                alert('שגיאה בעדכון')
                                fetchCity()
                              }
                            } catch (error) {
                              console.error('Error updating require_call_id:', error)
                              alert('שגיאה בעדכון')
                              fetchCity() // Revert to server value
                            }
                          }}
                          className={`px-6 py-2 rounded-xl font-semibold transition-all ${
                            city.require_call_id
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-300 text-gray-600'
                          }`}
                        >
                          {city.require_call_id ? 'ON' : 'OFF'}
                        </button>
                      </div>

                      {/* Hide Location */}
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                          <div className="font-semibold text-gray-800">👁️ הסתרת מיקום מדף ראשי</div>
                          <div className="text-sm text-gray-500">המיקום יישלח רק בטוקן ולא יוצג בדף הראשי</div>
                        </div>
                        <button
                          onClick={async () => {
                            const newValue = !city.hide_location

                            // Update local state immediately for instant feedback
                            setCity({ ...city, hide_location: newValue })

                            try {
                              const response = await fetch('/api/city/update-details', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  cityId,
                                  manager1_name: city?.manager1_name,
                                  manager1_phone: city?.manager1_phone,
                                  manager2_name: city?.manager2_name,
                                  manager2_phone: city?.manager2_phone,
                                  location_url: city?.location_url,
                                  hide_location: newValue
                                })
                              })

                              if (response.ok) {
                                alert(newValue ? '👁️ מיקום מוסתר מדף ראשי' : '✅ מיקום מוצג בדף ראשי')
                              } else {
                                alert('שגיאה בעדכון')
                                fetchCity()
                              }
                            } catch (error) {
                              console.error('Error updating hide_location:', error)
                              alert('שגיאה בעדכון')
                              fetchCity() // Revert to server value
                            }
                          }}
                          className={`px-6 py-2 rounded-xl font-semibold transition-all ${
                            city.hide_location
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-300 text-gray-600'
                          }`}
                        >
                          {city.hide_location ? 'מוסתר' : 'מוצג'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Copy Equipment Section */}
                {!showCopyEquipment ? (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">📋 העתק ציוד מעיר אחרת</h3>
                        <p className="text-sm text-gray-600">טען רשימת ציוד מוכנה מעיר קיימת - חיסכון בזמן לערים חדשות</p>
                      </div>
                      <Button
                        onClick={() => setShowCopyEquipment(true)}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105"
                      >
                        📥 העתק ציוד
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-gray-800">📥 העתק ציוד מעיר אחרת</CardTitle>
                      <CardDescription>בחר עיר להעתקת הציוד ממנה. ציוד כפול לא יועתק.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">🏙️ בחר עיר</label>
                          <select
                            value={selectedCityToCopy}
                            onChange={(e) => setSelectedCityToCopy(e.target.value)}
                            className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 transition-colors bg-white text-gray-800"
                          >
                            <option value="">-- בחר עיר --</option>
                            {allCities.map(city => (
                              <option key={city.id} value={city.id}>{city.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-3">
                          <Button
                            onClick={handleCopyEquipmentFromCity}
                            disabled={loading || !selectedCityToCopy}
                            className="flex-1 h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                          >
                            {loading ? '⏳ מעתיק...' : '✅ העתק ציוד'}
                          </Button>
                          <Button
                            onClick={() => {
                              setShowCopyEquipment(false)
                              setSelectedCityToCopy('')
                            }}
                            className="flex-1 h-12 bg-white border-2 border-gray-400 text-gray-700 hover:bg-gray-50 font-semibold rounded-xl transition-all"
                          >
                            ❌ ביטול
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* City Details Edit Form */}
                <Card className="border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-gray-800">📋 פרטי העיר</CardTitle>
                    <CardDescription>עדכן פרטי קשר וכתובת הארון</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleUpdateCityDetails} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Manager 1 */}
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">👤 שם מנהל ראשון *</label>
                          <Input
                            type="text"
                            value={editCityForm.manager1_name}
                            onChange={(e) => setEditCityForm({ ...editCityForm, manager1_name: e.target.value })}
                            placeholder="שם מלא"
                            className="h-12 border-2 border-gray-200 rounded-xl focus:border-indigo-500 transition-colors"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">📞 טלפון מנהל ראשון *</label>
                          <Input
                            type="tel"
                            value={editCityForm.manager1_phone}
                            onChange={(e) => setEditCityForm({ ...editCityForm, manager1_phone: e.target.value })}
                            placeholder="0501234567"
                            className="h-12 border-2 border-gray-200 rounded-xl focus:border-indigo-500 transition-colors"
                            required
                          />
                        </div>

                        {/* Manager 2 */}
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">👤 שם מנהל שני (אופציונלי)</label>
                          <Input
                            type="text"
                            value={editCityForm.manager2_name}
                            onChange={(e) => setEditCityForm({ ...editCityForm, manager2_name: e.target.value })}
                            placeholder="שם מלא"
                            className="h-12 border-2 border-gray-200 rounded-xl focus:border-indigo-500 transition-colors"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">📞 טלפון מנהל שני (אופציונלי)</label>
                          <Input
                            type="tel"
                            value={editCityForm.manager2_phone}
                            onChange={(e) => setEditCityForm({ ...editCityForm, manager2_phone: e.target.value })}
                            placeholder="0501234567"
                            className="h-12 border-2 border-gray-200 rounded-xl focus:border-indigo-500 transition-colors"
                          />
                        </div>
                      </div>

                      {/* Location URL */}
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">📍 כתובת ארון (קישור Google Maps)</label>
                        <Input
                          type="url"
                          value={editCityForm.location_url}
                          onChange={(e) => setEditCityForm({ ...editCityForm, location_url: e.target.value })}
                          placeholder="https://maps.google.com/?q=..."
                          className="h-12 border-2 border-gray-200 rounded-xl focus:border-indigo-500 transition-colors"
                        />
                        <p className="text-xs text-gray-500">הדבק קישור ממפות Google (אופציונלי)</p>
                      </div>

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                      >
                        {loading ? '⏳ שומר...' : '💾 שמור שינויים'}
                      </Button>

                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <p className="text-xs text-blue-800">
                          ℹ️ <strong>שים לב:</strong> שינוי פרטים ישלח התראה למנהל הראשי
                        </p>
                      </div>
                    </form>
                  </CardContent>
                </Card>

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
  )
}
