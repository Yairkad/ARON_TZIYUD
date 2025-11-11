'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { Equipment, BorrowHistory, City } from '@/types'
import { ArrowRight, FileDown, Bell, BellOff } from 'lucide-react'
import * as XLSX from 'xlsx'
import Logo from '@/components/Logo'
import { loginCity, checkAuth, logout } from '@/lib/auth'
import RequestsTab from '@/components/RequestsTab'
import {
  isPushSupported,
  hasNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed
} from '@/lib/push'

// Function to extract coordinates from Google Maps URL
// Handles both full URLs and short URLs (via API expansion)
async function extractCoordinatesFromUrl(url: string): Promise<{ lat: number; lng: number } | null> {
  if (!url) return null

  try {
    // Check if this is a short URL that needs expansion
    const isShortUrl = url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps')

    if (isShortUrl) {
      // Use API to expand short URL and extract coordinates
      const response = await fetch('/api/maps/expand-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.lat && data.lng) {
          return { lat: data.lat, lng: data.lng }
        }
      }
      // If API fails, fall through to manual extraction
    }

    // Manual extraction for full URLs
    // Pattern 1: maps.google.com/?q=lat,lng
    const qPattern = /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/
    const qMatch = url.match(qPattern)
    if (qMatch) {
      return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) }
    }

    // Pattern 2: @lat,lng in URL
    const atPattern = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/
    const atMatch = url.match(atPattern)
    if (atMatch) {
      return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) }
    }

    // Pattern 3: /place/.../@lat,lng
    const placePattern = /place\/[^/]+\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/
    const placeMatch = url.match(placePattern)
    if (placeMatch) {
      return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) }
    }

    // Pattern 4: ll=lat,lng (sometimes used)
    const llPattern = /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/
    const llMatch = url.match(llPattern)
    if (llMatch) {
      return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) }
    }

    return null
  } catch (error) {
    console.error('Error extracting coordinates:', error)
    return null
  }
}

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
    location_url: '',
    token_location_url: '',
    location_description: '',
    location_image_url: '',
    lat: null as number | null,
    lng: null as number | null,
    token_lat: null as number | null,
    token_lng: null as number | null
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
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [isEditingLocation, setIsEditingLocation] = useState(false)
  const [showRequestsNotification, setShowRequestsNotification] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushSupported, setPushSupported] = useState(false)
  const [enablingPush, setEnablingPush] = useState(false)
  const [isCityDetailsExpanded, setIsCityDetailsExpanded] = useState(false)
  const [equipmentSearchQuery, setEquipmentSearchQuery] = useState('')

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
      fetchPendingRequestsCount()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, cityId])

  // Auto-refresh pending requests count every 15 seconds when in request mode
  useEffect(() => {
    if (isAuthenticated && city?.request_mode === 'request') {
      const interval = setInterval(() => {
        fetchPendingRequestsCount()
      }, 15000)

      return () => clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, city?.request_mode])

  // Show notification popup when there are pending requests
  useEffect(() => {
    if (pendingRequestsCount > 0 && isAuthenticated && city?.request_mode === 'request') {
      const alertKey = `pending-requests-${pendingRequestsCount}`

      if (!dismissedAlerts.has(alertKey)) {
        setShowRequestsNotification(true)
        setDismissedAlerts(prev => new Set(prev).add(alertKey))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRequestsCount, isAuthenticated, city?.request_mode])

  // Check push notification support and subscription status
  useEffect(() => {
    const checkPushStatus = async () => {
      const supported = isPushSupported()
      setPushSupported(supported)

      if (supported && isAuthenticated) {
        const subscribed = await isSubscribed()
        setPushEnabled(subscribed)
      }
    }

    checkPushStatus()
  }, [isAuthenticated])

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
          location_url: data.location_url || '',
          token_location_url: data.token_location_url || '',
          location_description: data.location_description || '',
          location_image_url: data.location_image_url || '',
          lat: data.lat || null,
          lng: data.lng || null,
          token_lat: data.token_lat || null,
          token_lng: data.token_lng || null
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

  // Group history records by borrower (name + phone) and date
  const groupedHistory = borrowHistory.reduce((acc, record) => {
    const borrowDate = new Date(record.borrow_date)
    const dateKey = borrowDate.toLocaleDateString('he-IL')
    const timeKey = borrowDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    const key = `${record.name}-${record.phone}-${dateKey}-${timeKey}`

    if (!acc[key]) {
      acc[key] = {
        id: key,
        name: record.name,
        phone: record.phone,
        borrow_date: record.borrow_date,
        date: dateKey,
        time: timeKey,
        items: [],
        allReturned: true
      }
    }

    acc[key].items.push(record)
    if (record.status === 'borrowed') {
      acc[key].allReturned = false
    }

    return acc
  }, {} as Record<string, {
    id: string
    name: string
    phone: string
    borrow_date: string
    date: string
    time: string
    items: BorrowHistory[]
    allReturned: boolean
  }>)

  const groupedHistoryArray = Object.values(groupedHistory)

  const fetchPendingRequestsCount = async () => {
    if (city?.request_mode !== 'request') return

    try {
      const { count, error } = await supabase
        .from('equipment_requests')
        .select('*', { count: 'exact', head: true })
        .eq('city_id', cityId)
        .eq('status', 'pending')

      if (error) {
        console.error('Error fetching pending requests count:', error)
      } else {
        setPendingRequestsCount(count || 0)
      }
    } catch (error) {
      console.error('Error fetching pending requests count:', error)
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

  // Toggle group expansion
  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
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
          location_url: editCityForm.location_url.trim() || null,
          token_location_url: editCityForm.token_location_url?.trim() || null,
          location_description: editCityForm.location_description?.trim() || null,
          location_image_url: editCityForm.location_image_url?.trim() || null,
          lat: editCityForm.lat,
          lng: editCityForm.lng,
          token_lat: editCityForm.token_lat,
          token_lng: editCityForm.token_lng,
          request_mode: city.request_mode,
          cabinet_code: city.cabinet_code,
          require_call_id: city.require_call_id
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'שגיאה בעדכון הפרטים')
        setLoading(false)
        return
      }

      alert('הפרטים עודכנו בהצלחה!')
      setIsEditingLocation(false)
      fetchCity()
      setLoading(false)
    } catch (error) {
      console.error('Error updating city details:', error)
      alert('אירעה שגיאה בעדכון הפרטים')
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

  const handleTogglePushNotifications = async () => {
    try {
      setEnablingPush(true)

      if (pushEnabled) {
        // Disable push notifications
        await unsubscribeFromPush()
        setPushEnabled(false)
        alert('✅ התראות כבויות')
      } else {
        // Enable push notifications
        // First, check if permission is already granted
        const hasPermission = hasNotificationPermission()

        if (!hasPermission) {
          // Request permission
          const granted = await requestNotificationPermission()
          if (!granted) {
            alert('❌ נדרשת הרשאה כדי להפעיל התראות. אנא אפשר התראות בהגדרות הדפדפן.')
            setEnablingPush(false)
            return
          }
        }

        // Subscribe to push notifications
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidPublicKey) {
          alert('❌ התראות לא זמינות כרגע.\n\nהמנהל הראשי צריך להגדיר את מפתחות VAPID ב-Vercel.\nלמידע נוסף ראה את הקובץ PUSH_NOTIFICATIONS_SETUP.md')
          setEnablingPush(false)
          return
        }

        await subscribeToPush(cityId, vapidPublicKey)
        setPushEnabled(true)
        alert('✅ התראות הופעלו בהצלחה! תקבל עדכונים על בקשות חדשות.')
      }
    } catch (error) {
      console.error('Error toggling push notifications:', error)
      alert('❌ שגיאה בהפעלת התראות. אנא נסה שוב.')
    } finally {
      setEnablingPush(false)
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
              {pushSupported && city?.request_mode === 'request' && (
                <Button
                  onClick={handleTogglePushNotifications}
                  disabled={enablingPush}
                  variant="outline"
                  className={`border-2 font-semibold px-6 py-2 rounded-xl transition-all duration-200 hover:scale-105 ${
                    pushEnabled
                      ? 'border-green-500 text-green-600 hover:bg-green-50'
                      : 'border-gray-400 text-gray-600 hover:bg-gray-50'
                  }`}
                  title={pushEnabled ? 'כבה התראות' : 'הפעל התראות'}
                >
                  {enablingPush ? (
                    '⏳'
                  ) : pushEnabled ? (
                    <>
                      <Bell className="ml-2 h-4 w-4" />
                      התראות פעילות
                    </>
                  ) : (
                    <>
                      <BellOff className="ml-2 h-4 w-4" />
                      הפעל התראות
                    </>
                  )}
                </Button>
              )}
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
          {/* Push Notifications - Only in request mode */}
          {pushSupported && city?.request_mode === 'request' && (
            <Button
              onClick={handleTogglePushNotifications}
              disabled={enablingPush}
              variant="outline"
              className={`w-full h-14 rounded-xl border-2 font-semibold text-lg transition-all ${
                pushEnabled
                  ? 'border-green-500 text-green-600 hover:bg-green-50'
                  : 'border-gray-400 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {enablingPush ? (
                '⏳ מפעיל...'
              ) : pushEnabled ? (
                <>
                  <Bell className="ml-2 h-5 w-5" />
                  התראות פעילות ✅
                </>
              ) : (
                <>
                  <BellOff className="ml-2 h-5 w-5" />
                  הפעל התראות
                </>
              )}
            </Button>
          )}
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
              className={`py-6 rounded-xl font-semibold text-lg transition-all duration-300 relative ${
                activeTab === 'requests'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50 scale-105'
                  : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
              }`}
            >
              <span className="text-2xl ml-2">📝</span> בקשות
              {pendingRequestsCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse shadow-lg">
                  {pendingRequestsCount}
                </span>
              )}
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <CardTitle className="text-2xl font-bold text-gray-800">📋 רשימת ציוד</CardTitle>
                  <div className="relative w-full sm:w-64">
                    <Input
                      type="text"
                      value={equipmentSearchQuery}
                      onChange={(e) => setEquipmentSearchQuery(e.target.value)}
                      placeholder="🔍 חפש ציוד..."
                      className="h-10 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-colors pr-3"
                    />
                    {equipmentSearchQuery && (
                      <button
                        onClick={() => setEquipmentSearchQuery('')}
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 md:p-6">
                {equipment.filter(item =>
                  item.name.toLowerCase().includes(equipmentSearchQuery.toLowerCase())
                ).length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔍</div>
                    <p className="text-gray-500 text-lg font-semibold">
                      {equipmentSearchQuery ? 'לא נמצא ציוד המתאים לחיפוש' : 'אין ציוד רשום במערכת'}
                    </p>
                    {equipmentSearchQuery && (
                      <p className="text-gray-400 text-sm mt-2">
                        נסה לחפש במילים אחרות
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Mobile View */}
                    <div className="block md:hidden space-y-4">
                      {equipment.filter(item =>
                        item.name.toLowerCase().includes(equipmentSearchQuery.toLowerCase())
                      ).map(item => (
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
                      {equipment.filter(item =>
                        item.name.toLowerCase().includes(equipmentSearchQuery.toLowerCase())
                      ).map(item => (
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
                  </>
                )}
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
                {groupedHistoryArray.map(group => {
                  const isExpanded = expandedGroups.has(group.id)
                  return (
                    <div key={group.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
                      {/* Header - Always visible */}
                      <div
                        className="flex justify-between items-center cursor-pointer"
                        onClick={() => toggleGroupExpansion(group.id)}
                      >
                        <div className="flex items-center gap-2">
                          <button className="text-xl transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                            ◀
                          </button>
                          <div>
                            <p className="text-xs text-gray-600 font-semibold">👤 {group.name}</p>
                            <p className="font-medium text-sm text-gray-700">{group.date} • {group.time}</p>
                          </div>
                        </div>
                        <div className={`px-3 py-1.5 rounded-lg font-bold text-xs ${
                          group.allReturned
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {group.allReturned ? '✅' : '⏳'}
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="space-y-3 mt-3 pt-3 border-t border-gray-300">
                          <div>
                            <p className="text-xs text-gray-600">📱 טלפון</p>
                            <p className="font-medium text-gray-800">{group.phone}</p>
                          </div>

                          {/* Equipment items */}
                          <div className="pt-2 border-t border-gray-300">
                            <p className="text-xs text-gray-600 font-semibold mb-2">🎯 ציוד שנלקח</p>
                            <div className="space-y-2">
                              {group.items.map(item => (
                                <div key={item.id} className={`flex justify-between items-center p-3 rounded-lg border-2 ${
                                  item.status === 'borrowed'
                                    ? 'bg-orange-50 border-orange-200'
                                    : 'bg-green-50 border-green-200'
                                }`}>
                                  <div className="flex-1">
                                    <p className="font-semibold text-gray-800">{item.equipment_name}</p>
                                    {item.status === 'returned' && item.return_image_url && (
                                      <a
                                        href={item.return_image_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        📸 תמונת החזרה
                                      </a>
                                    )}
                                  </div>
                                  <div className="flex gap-2 items-center">
                                    {item.status === 'returned' && item.return_image_url && (
                                      <a
                                        href={item.return_image_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xl hover:scale-110 transition-transform"
                                        title="צפה בתמונת החזרה"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        📷
                                      </a>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleUpdateHistoryStatus(
                                          item.id,
                                          item.status === 'borrowed' ? 'returned' : 'borrowed'
                                        )
                                      }}
                                      disabled={loading}
                                      className="text-2xl hover:scale-110 transition-transform"
                                      title={item.status === 'borrowed' ? 'סמן כהוחזר' : 'סמן כהושאל'}
                                    >
                                      {item.status === 'borrowed' ? '🟠' : '🟢'}
                                    </button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteHistory(item.id)
                                      }}
                                      disabled={loading}
                                      className="h-8 px-2 bg-red-500 hover:bg-red-600"
                                    >
                                      🗑️
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-100 to-indigo-100 border-b-2 border-blue-200">
                      <th className="text-right p-4 font-bold text-gray-700 w-8"></th>
                      <th className="text-right p-4 font-bold text-gray-700">👤 שם</th>
                      <th className="text-right p-4 font-bold text-gray-700">📅 תאריך</th>
                      <th className="text-right p-4 font-bold text-gray-700">🕐 שעה</th>
                      <th className="text-right p-4 font-bold text-gray-700">📱 טלפון</th>
                      <th className="text-right p-4 font-bold text-gray-700">🎯 ציוד שנלקח</th>
                      <th className="text-right p-4 font-bold text-gray-700">🟢 סטטוס</th>
                      <th className="text-right p-4 font-bold text-gray-700">⚙️ פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedHistoryArray.map(group => {
                      const isExpanded = expandedGroups.has(group.id)
                      return (
                        <tr key={group.id} className="border-b hover:bg-blue-50 transition-colors">
                          <td className="p-4">
                            <button
                              onClick={() => toggleGroupExpansion(group.id)}
                              className="text-lg transition-transform duration-200 hover:scale-110"
                              style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                            >
                              ◀
                            </button>
                          </td>
                          <td className="p-4 font-bold text-gray-800">{group.name}</td>
                          <td className="p-4 text-gray-700">{group.date}</td>
                          <td className="p-4 text-gray-600">{group.time}</td>
                          <td className="p-4 text-gray-600">{group.phone}</td>
                          <td className="p-4">
                            {isExpanded ? (
                              <div className="flex flex-wrap gap-1">
                                {group.items.map((item, idx) => (
                                  <div key={item.id} className="flex items-center gap-1">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${
                                      item.status === 'borrowed'
                                        ? 'bg-orange-100 text-orange-700 border border-orange-300'
                                        : 'bg-green-100 text-green-700 border border-green-300'
                                    }`}>
                                      {item.equipment_name}
                                      {item.status === 'returned' && item.return_image_url && (
                                        <a
                                          href={item.return_image_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="ml-1 hover:scale-110 transition-transform"
                                          title="צפה בתמונת החזרה"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          📷
                                        </a>
                                      )}
                                      <button
                                        onClick={() => handleUpdateHistoryStatus(item.id, item.status === 'borrowed' ? 'returned' : 'borrowed')}
                                        className="ml-1 hover:scale-110 transition-transform"
                                        disabled={loading}
                                        title={item.status === 'borrowed' ? 'סמן כהוחזר' : 'סמן כהושאל'}
                                      >
                                        {item.status === 'borrowed' ? '🟠' : '🟢'}
                                      </button>
                                    </span>
                                    {idx < group.items.length - 1 && <span className="text-gray-400">•</span>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-500 text-sm">{group.items.length} פריטים</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              group.allReturned
                                ? 'bg-green-100 text-green-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}>
                              {group.allReturned ? '✅' : '⏳'}
                            </span>
                          </td>
                          <td className="p-4">
                            {isExpanded ? (
                              <div className="flex gap-2">
                                {group.items.map(item => (
                                  <Button
                                    key={item.id}
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteHistory(item.id)}
                                    disabled={loading}
                                    className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 text-gray-400"
                                    title={`מחק: ${item.equipment_name}`}
                                  >
                                    🗑️
                                  </Button>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">לחץ על החץ</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Export Button - Bottom */}
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={handleExportToExcel}
                  size="sm"
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all"
                >
                  <FileDown className="ml-2 h-4 w-4" />
                  ייצוא לאקסל
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'requests' && city && (
          <RequestsTab
            cityId={cityId}
            cityName={city.name}
            managerName={city.manager1_name}
            onRequestsUpdate={fetchPendingRequestsCount}
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
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-bold text-gray-800">📋 פרטי העיר</CardTitle>
                        <CardDescription>עדכן פרטי קשר וכתובת הארון</CardDescription>
                      </div>
                      <Button
                        type="button"
                        onClick={() => setIsCityDetailsExpanded(!isCityDetailsExpanded)}
                        variant="outline"
                        className="border-2 border-indigo-300 hover:bg-indigo-100 transition-colors"
                      >
                        {isCityDetailsExpanded ? (
                          <>🔼 כיווץ</>
                        ) : (
                          <>🔽 הרחב</>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!isCityDetailsExpanded ? (
                      /* Collapsed View - Summary */
                      <div className="space-y-3">
                        <div className="bg-white rounded-lg p-4 border border-indigo-100">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="font-semibold text-gray-700">👤 מנהל ראשון:</span>
                              <span className="text-gray-600 mr-2">{city?.manager1_name || 'לא הוגדר'}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-gray-700">📞 טלפון:</span>
                              <span className="text-gray-600 mr-2">{city?.manager1_phone || 'לא הוגדר'}</span>
                            </div>
                            {city?.manager2_name && (
                              <>
                                <div>
                                  <span className="font-semibold text-gray-700">👤 מנהל שני:</span>
                                  <span className="text-gray-600 mr-2">{city.manager2_name}</span>
                                </div>
                                <div>
                                  <span className="font-semibold text-gray-700">📞 טלפון:</span>
                                  <span className="text-gray-600 mr-2">{city.manager2_phone || ''}</span>
                                </div>
                              </>
                            )}
                            <div className="md:col-span-2">
                              <span className="font-semibold text-gray-700">📍 מיקום בדף הראשי:</span>
                              <span className="text-gray-600 mr-2">{city?.location_url ? '✓ מוגדר' : '✗ לא מוגדר'}</span>
                            </div>
                            <div className="md:col-span-2">
                              <span className="font-semibold text-gray-700">🔐 מיקום בטוקן:</span>
                              <span className="text-gray-600 mr-2">{city?.token_location_url ? '✓ מוגדר' : '✗ לא מוגדר'}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 text-center">
                          💡 לחץ על "הרחב" כדי לערוך את הפרטים
                        </p>
                      </div>
                    ) : (
                      /* Expanded View - Full Form */
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

                      {/* Location Settings Section with Edit/Save Buttons */}
                      <div className="border-2 border-indigo-200 rounded-xl p-4 bg-indigo-50/50">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold text-gray-900">📍 הגדרות מיקום</h3>
                          {!isEditingLocation ? (
                            <Button
                              type="button"
                              onClick={() => setIsEditingLocation(true)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2"
                            >
                              ✏️ ערוך
                            </Button>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                onClick={() => setIsEditingLocation(false)}
                                variant="outline"
                                className="border-2 border-gray-300 rounded-lg px-4 py-2"
                              >
                                ❌ ביטול
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          {/* Location URL for main page */}
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">📍 כתובת ארון בדף הראשי</label>
                            <Input
                              type="url"
                              value={editCityForm.location_url}
                              onChange={async (e) => {
                                if (isEditingLocation) {
                                  const newUrl = e.target.value
                                  // If URL is empty, clear coordinates too
                                  if (!newUrl.trim()) {
                                    setEditCityForm({
                                      ...editCityForm,
                                      location_url: '',
                                      lat: null,
                                      lng: null
                                    })
                                  } else {
                                    // Set URL immediately for responsive UI
                                    setEditCityForm({
                                      ...editCityForm,
                                      location_url: newUrl,
                                      lat: null,
                                      lng: null
                                    })
                                    // Extract coordinates asynchronously (handles short URLs automatically)
                                    const coords = await extractCoordinatesFromUrl(newUrl)
                                    if (coords) {
                                      setEditCityForm(prev => ({
                                        ...prev,
                                        lat: coords.lat,
                                        lng: coords.lng
                                      }))
                                    }
                                  }
                                }
                              }}
                              placeholder="https://maps.google.com/?q=... או קישור קצר"
                              className={`h-12 border-2 rounded-xl transition-colors ${
                                isEditingLocation
                                  ? 'border-gray-200 focus:border-indigo-500 cursor-text'
                                  : 'border-gray-100 bg-gray-50 text-gray-600 cursor-not-allowed'
                              }`}
                            />
                            <p className="text-xs text-gray-500">יוצג בדף הראשי לכל המשתמשים (אופציונלי)</p>
                          </div>

                          {/* Token Location URL - separate field for token page */}
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">🔐 כתובת ארון בטוקן</label>
                            <Input
                              type="url"
                              value={editCityForm.token_location_url || ''}
                              onChange={async (e) => {
                                if (isEditingLocation) {
                                  const newUrl = e.target.value
                                  // If URL is empty, clear coordinates too
                                  if (!newUrl.trim()) {
                                    setEditCityForm({
                                      ...editCityForm,
                                      token_location_url: '',
                                      token_lat: null,
                                      token_lng: null
                                    })
                                  } else {
                                    // Set URL immediately for responsive UI
                                    setEditCityForm({
                                      ...editCityForm,
                                      token_location_url: newUrl,
                                      token_lat: null,
                                      token_lng: null
                                    })
                                    // Extract coordinates asynchronously (handles short URLs automatically)
                                    const coords = await extractCoordinatesFromUrl(newUrl)
                                    if (coords) {
                                      setEditCityForm(prev => ({
                                        ...prev,
                                        token_lat: coords.lat,
                                        token_lng: coords.lng
                                      }))
                                    }
                                  }
                                }
                              }}
                              placeholder="https://maps.google.com/?q=... או קישור קצר"
                              className={`h-12 border-2 rounded-xl transition-colors ${
                                isEditingLocation
                                  ? 'border-purple-200 focus:border-purple-500 cursor-text'
                                  : 'border-gray-100 bg-gray-50 text-gray-600 cursor-not-allowed'
                              }`}
                            />
                            <p className="text-xs text-purple-600">יוצג רק בדף הטוקן לאחר אישור בקשה (אופציונלי)</p>
                          </div>

                          {/* Location Description */}
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">📝 תיאור מיקום הארון</label>
                            <textarea
                              value={editCityForm.location_description || ''}
                              onChange={(e) => {
                                if (isEditingLocation) {
                                  setEditCityForm({ ...editCityForm, location_description: e.target.value })
                                }
                              }}
                              placeholder="לדוגמה: הארון נמצא בכניסה הראשית, ליד דלפק הקבלה..."
                              rows={4}
                              className={`w-full p-3 border-2 rounded-xl transition-colors resize-none ${
                                isEditingLocation
                                  ? 'border-gray-200 focus:border-indigo-500 cursor-text'
                                  : 'border-gray-100 bg-gray-50 text-gray-600 cursor-not-allowed'
                              }`}
                            />
                            <p className="text-xs text-gray-500">הוראות טקסט למציאת הארון - יוצג בדף הטוקן (אופציונלי)</p>
                          </div>

                          {/* Location Image URL */}
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">🖼️ קישור לתמונת מיקום</label>
                            <Input
                              type="url"
                              value={editCityForm.location_image_url || ''}
                              onChange={(e) => {
                                if (isEditingLocation) {
                                  setEditCityForm({ ...editCityForm, location_image_url: e.target.value })
                                }
                              }}
                              placeholder="https://example.com/image.jpg"
                              className={`h-12 border-2 rounded-xl transition-colors ${
                                isEditingLocation
                                  ? 'border-gray-200 focus:border-indigo-500 cursor-text'
                                  : 'border-gray-100 bg-gray-50 text-gray-600 cursor-not-allowed'
                              }`}
                            />
                            <p className="text-xs text-gray-500">תמונה של הארון/מיקום - יוצג בדף הטוקן (אופציונלי)</p>
                          </div>
                        </div>
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
                    )}
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

        {/* Requests Notification Dialog */}
        {showRequestsNotification && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-300">
              <div className="p-6 sm:p-8">
                {/* Icon and Title */}
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4 animate-bounce">🔔</div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                    בקשות חדשות!
                  </h2>
                  <p className="text-lg text-gray-600">
                    {pendingRequestsCount === 1
                      ? 'יש בקשה אחת חדשה ממתינה לאישור'
                      : `יש ${pendingRequestsCount} בקשות חדשות ממתינות לאישור`}
                  </p>
                </div>

                {/* Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={() => {
                      setActiveTab('requests')
                      setShowRequestsNotification(false)
                    }}
                    className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  >
                    📋 מעבר לבקשות
                  </Button>
                  <Button
                    onClick={() => setShowRequestsNotification(false)}
                    variant="outline"
                    className="w-full h-12 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold text-base rounded-xl transition-all duration-200"
                  >
                    סגור
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
