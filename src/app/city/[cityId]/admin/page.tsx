'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { Equipment, BorrowHistory, City } from '@/types'
import { ArrowRight, FileDown, Bell, BellOff } from 'lucide-react'
import Logo from '@/components/Logo'
import { checkAuth, logout } from '@/lib/auth'
import RequestsTab from '@/components/RequestsTab'
import {
  isPushSupported,
  hasNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed
} from '@/lib/push'
import { uploadImage, deleteImage } from '@/lib/uploadImage'

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
  const router = useRouter()
  const cityId = params.cityId as string

  const [city, setCity] = useState<City | null>(null)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [borrowHistory, setBorrowHistory] = useState<BorrowHistory[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true) // Add loading state for auth check
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'equipment' | 'history' | 'requests' | 'settings'>('equipment')
  const [newEquipment, setNewEquipment] = useState({ name: '', quantity: 1, equipment_status: 'working' as 'working' | 'faulty', is_consumable: false, category_id: '', image_url: '' })
  const [newEquipmentImageFile, setNewEquipmentImageFile] = useState<File | null>(null)
  const [editingEquipment, setEditingEquipment] = useState<{ id: string; name: string; quantity: number; equipment_status: 'working' | 'faulty'; is_consumable: boolean; category_id?: string; image_url?: string } | null>(null)
  const [editingEquipmentImageFile, setEditingEquipmentImageFile] = useState<File | null>(null)
  const [editCityForm, setEditCityForm] = useState({
    manager1_name: '',
    manager1_phone: '',
    manager2_name: '',
    manager2_phone: '',
    location_url: '',
    token_location_url: '',
    location_image: null as string | null,
    location_description: '',
    lat: null as number | null,
    lng: null as number | null,
    token_lat: null as number | null,
    token_lng: null as number | null
  })
  const [allCities, setAllCities] = useState<City[]>([])
  const [selectedCityToCopy, setSelectedCityToCopy] = useState<string>('')
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
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showAccountSettings, setShowAccountSettings] = useState(false)
  const [accountForm, setAccountForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  })

  // Permission helpers
  const canEdit = currentUser?.permissions === 'full_access'
  const canApprove = currentUser?.permissions === 'approve_requests' || currentUser?.permissions === 'full_access'

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
      fetchCategories()
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
          location_image: data.location_image || null,
          location_description: data.location_description || '',
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
      .select(`
        *,
        category:equipment_categories(id, name)
      `)
      .eq('city_id', cityId)
      .order('name')

    if (error) {
      console.error('Error fetching equipment:', error)
    } else {
      setEquipment(data || [])
    }
  }

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('equipment_categories')
      .select('*')
      .order('display_order')

    if (error) {
      console.error('Error fetching categories:', error)
    } else {
      setCategories(data || [])
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


  // בדיקת אימות בטעינת הדף
  useEffect(() => {
    const verifyAuth = async () => {
      const { authenticated, userId, userType, cityId: userCityId, user } = await checkAuth()

      // Allow access if:
      // 1. Logged in as super admin (can access any city)
      // 2. Logged in as city manager - check if they manage this specific city
      if (authenticated && userType === 'super') {
        console.log('✅ Access granted: Super Admin', { userId, cityId })
        setIsAuthenticated(true)
        setCurrentUser(user)
        setIsCheckingAuth(false)
        return
      }

      if (authenticated && userType === 'city') {
        // For city managers, check if they manage this specific city
        try {
          const response = await fetch('/api/auth/my-cities', {
            credentials: 'include'
          })

          if (response.ok) {
            const data = await response.json()
            const managedCities = data.cities || []
            const managesThisCity = managedCities.some((c: any) => c.id === cityId)

            if (managesThisCity) {
              console.log('✅ Access granted: City Manager', { userId, cityId, managedCities: managedCities.length })
              setIsAuthenticated(true)
              setCurrentUser(user)
            } else {
              console.log('❌ Access denied - user does not manage this city', { authenticated, userType, cityId, managedCities })
              setCurrentUser(null)
            }
          } else {
            console.log('❌ Access denied - failed to fetch managed cities')
            setCurrentUser(null)
          }
        } catch (error) {
          console.error('❌ Error checking city access:', error)
          setCurrentUser(null)
        }
      } else {
        console.log('❌ Access denied - not authenticated', { authenticated, userType, cityId })
        setCurrentUser(null)
      }

      setIsCheckingAuth(false) // Auth check complete
    }
    verifyAuth()
  }, [cityId])

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check permissions
    if (!canEdit) {
      alert('אין לך הרשאה לבצע פעולה זו - נדרשת הרשאת עריכה מלאה')
      return
    }

    if (!newEquipment.name || newEquipment.quantity < 0) {
      alert('אנא מלא שם וכמות תקינים')
      return
    }

    setLoading(true)
    try {
      let imageUrl = newEquipment.image_url

      // Upload image if a file was selected
      if (newEquipmentImageFile) {
        const uploadedUrl = await uploadImage(newEquipmentImageFile, 'equipment')
        if (uploadedUrl) {
          imageUrl = uploadedUrl
        } else {
          alert('שגיאה בהעלאת התמונה, הציוד יתווסף ללא תמונה')
        }
      }

      const { error } = await supabase
        .from('equipment')
        .insert({
          name: newEquipment.name,
          quantity: newEquipment.quantity,
          city_id: cityId,
          equipment_status: newEquipment.equipment_status,
          is_consumable: newEquipment.is_consumable,
          category_id: newEquipment.category_id || null,
          image_url: imageUrl || null
        })

      if (error) throw error

      alert('הציוד נוסף בהצלחה!')
      setNewEquipment({ name: '', quantity: 1, equipment_status: 'working', is_consumable: false, category_id: '', image_url: '' })
      setNewEquipmentImageFile(null)
      fetchEquipment()
    } catch (error) {
      console.error('Error adding equipment:', error)
      alert('אירעה שגיאה בהוספת הציוד')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateEquipment = async (id: string, name: string, quantity: number, equipment_status: 'working' | 'faulty', is_consumable: boolean, category_id?: string, image_url?: string) => {
    // Check permissions
    if (!canEdit) {
      alert('אין לך הרשאה לבצע פעולה זו - נדרשת הרשאת עריכה מלאה')
      return
    }

    if (!name || quantity < 0) {
      alert('אנא מלא שם וכמות תקינים')
      return
    }

    setLoading(true)
    try {
      let finalImageUrl = image_url

      // Upload new image if a file was selected
      if (editingEquipmentImageFile) {
        const uploadedUrl = await uploadImage(editingEquipmentImageFile, 'equipment')
        if (uploadedUrl) {
          // Delete old image if exists and is from our storage
          if (image_url && image_url.includes('supabase.co/storage')) {
            await deleteImage(image_url)
          }
          finalImageUrl = uploadedUrl
        } else {
          alert('שגיאה בהעלאת התמונה החדשה, התמונה הקודמת תישאר')
        }
      }

      const { error } = await supabase
        .from('equipment')
        .update({
          name,
          quantity,
          equipment_status,
          is_consumable,
          category_id: category_id || null,
          image_url: finalImageUrl || null
        })
        .eq('id', id)

      if (error) throw error

      alert('הציוד עודכן בהצלחה!')
      setEditingEquipment(null)
      setEditingEquipmentImageFile(null)
      fetchEquipment()
    } catch (error) {
      console.error('Error updating equipment:', error)
      alert('אירעה שגיאה בעדכון הציוד')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEquipment = async (id: string) => {
    // Check permissions
    if (!canEdit) {
      alert('אין לך הרשאה לבצע פעולה זו - נדרשת הרשאת עריכה מלאה')
      return
    }

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

  // Approve or reject return
  const handleApproveReturn = async (id: string, approve: boolean) => {
    if (!approve && !confirm('האם אתה בטוח שברצונך לדחות את ההחזרה? הציוד יישאר במצב "מושאל".')) {
      return
    }

    setLoading(true)
    try {
      // Get the borrow record to find the equipment_id and status
      const { data: borrowRecord, error: fetchError } = await supabase
        .from('borrow_history')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      if (borrowRecord.status !== 'pending_approval') {
        alert('רשומה זו אינה ממתינה לאישור')
        return
      }

      if (approve) {
        // Approve return - update status to 'returned' and restore quantity
        const { error: updateError } = await supabase
          .from('borrow_history')
          .update({ status: 'returned' })
          .eq('id', id)

        if (updateError) throw updateError

        // Restore equipment quantity and update status if needed
        const equipmentItem = equipment.find(eq => eq.id === borrowRecord.equipment_id)
        if (equipmentItem) {
          const updateData: any = {
            quantity: equipmentItem.quantity + 1
          }

          // Update equipment status if user reported it as faulty
          if (borrowRecord.equipment_status === 'faulty') {
            updateData.equipment_status = 'faulty'
          }

          const { error: qtyUpdateError } = await supabase
            .from('equipment')
            .update(updateData)
            .eq('id', borrowRecord.equipment_id)

          if (qtyUpdateError) throw qtyUpdateError
        }

        alert('ההחזרה אושרה והציוד חזר למלאי!')
      } else {
        // Reject return - revert status back to 'borrowed'
        const { error: updateError } = await supabase
          .from('borrow_history')
          .update({
            status: 'borrowed',
            return_date: null,
            equipment_status: null,
            return_image_url: null,
            return_image_uploaded_at: null
          })
          .eq('id', id)

        if (updateError) throw updateError

        alert('ההחזרה נדחתה. הציוד חזר למצב "מושאל".')
      }

      fetchHistory()
      fetchEquipment() // Refresh equipment to show updated quantity
    } catch (error) {
      console.error('Error approving/rejecting return:', error)
      alert('אירעה שגיאה בטיפול בהחזרה')
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

  // Export to Excel - Lazy load XLSX library
  const handleExportToExcel = async () => {
    if (!city) return

    try {
      // Lazy load XLSX library only when needed
      const XLSX = await import('xlsx')

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
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      alert('שגיאה בייצוא לאקסל')
    }
  }

  // Print functionality
  const handleDeleteHistory = async (id: string) => {
    // Check permissions
    if (!canEdit) {
      alert('אין לך הרשאה לבצע פעולה זו - נדרשת הרשאת עריכה מלאה')
      return
    }

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

    // Check permissions
    if (!canEdit) {
      alert('אין לך הרשאה לבצע פעולה זו - נדרשת הרשאת עריכה מלאה')
      return
    }

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
      // Get access token from Supabase session
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      console.log('🔑 Sending request with token:', !!accessToken)

      const response = await fetch('/api/city/update-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
        credentials: 'include',
        body: JSON.stringify({
          cityId: cityId,
          manager1_name: editCityForm.manager1_name.trim(),
          manager1_phone: editCityForm.manager1_phone.trim(),
          manager2_name: editCityForm.manager2_name.trim() || null,
          manager2_phone: editCityForm.manager2_phone.trim() || null,
          location_url: editCityForm.location_url.trim() || null,
          token_location_url: editCityForm.token_location_url?.trim() || null,
          location_image: editCityForm.location_image,
          location_description: editCityForm.location_description.trim() || null,
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
    // Check permissions
    if (!canEdit) {
      alert('אין לך הרשאה לבצע פעולה זו - נדרשת הרשאת עריכה מלאה')
      return
    }

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
        // Check current permission status
        console.log('📱 Requesting notification permission...')
        console.log('📱 Current Notification.permission:', Notification?.permission)

        const granted = await requestNotificationPermission()
        console.log('📱 Permission result:', granted ? 'granted' : 'denied')

        if (!granted) {
          // Check if blocked
          if (Notification?.permission === 'denied') {
            alert('❌ התראות חסומות בדפדפן.\n\nכדי להפעיל התראות:\n1. לחץ על סמל המנעול/מידע ליד כתובת האתר\n2. מצא "הודעות" או "Notifications"\n3. שנה ל-"אפשר" או "Allow"\n4. רענן את הדף ונסה שוב')
          } else {
            alert('❌ נדרשת הרשאה כדי להפעיל התראות. אנא אפשר התראות בהגדרות הדפדפן.')
          }
          setEnablingPush(false)
          return
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

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen content-wrapper flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">בודק הרשאות...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Redirect to login page
    router.push('/login')
    return (
      <div className="min-h-screen content-wrapper flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔐</div>
          <p className="text-gray-600">מעביר להתחברות...</p>
        </div>
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
              <Button
                onClick={() => {
                  console.log('📝 Opening account settings with currentUser:', {
                    full_name: currentUser?.full_name,
                    phone: currentUser?.phone,
                    email: currentUser?.email
                  })

                  setAccountForm({
                    full_name: currentUser?.full_name || '',
                    phone: currentUser?.phone || '',
                    email: currentUser?.email || '',
                    current_password: '',
                    new_password: '',
                    confirm_password: ''
                  })
                  setShowAccountSettings(true)
                }}
                variant="outline"
                className="border-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50 font-semibold px-6 py-2 rounded-xl transition-all duration-200 hover:scale-105"
              >
                ⚙️ הגדרות חשבון
              </Button>
              <Link href="/manager-guide">
                <Button
                  variant="outline"
                  className="border-2 border-purple-500 text-purple-600 hover:bg-purple-50 font-semibold px-6 py-2 rounded-xl transition-all duration-200 hover:scale-105"
                >
                  📚 מדריך מנהל
                </Button>
              </Link>
              {pushSupported && city?.request_mode === 'request' && city?.enable_push_notifications && (
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
                  router.push('/')
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
          <Link href="/manager-guide" className="w-full">
            <Button
              variant="outline"
              className="w-full h-14 rounded-xl border-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50 text-purple-600 font-semibold text-lg transition-all"
            >
              📚 מדריך מנהל עיר
            </Button>
          </Link>
          {/* Push Notifications - Only in request mode and if enabled by city */}
          {pushSupported && city?.request_mode === 'request' && city?.enable_push_notifications && (
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
                router.push(`/city/${cityId}`)
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
                      disabled={!canEdit}
                      className="flex-1 h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <Input
                      type="number"
                      value={newEquipment.quantity}
                      onChange={(e) => setNewEquipment({ ...newEquipment, quantity: parseInt(e.target.value) || 0 })}
                      placeholder="כמות"
                      disabled={!canEdit}
                      className="w-full sm:w-20 h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <select
                      value={newEquipment.equipment_status}
                      onChange={(e) => setNewEquipment({ ...newEquipment, equipment_status: e.target.value as 'working' | 'faulty' })}
                      disabled={!canEdit}
                      className="w-full sm:w-32 h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-colors px-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="working">✅ תקין</option>
                      <option value="faulty">⚠️ תקול</option>
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <select
                      value={newEquipment.category_id}
                      onChange={(e) => setNewEquipment({ ...newEquipment, category_id: e.target.value })}
                      disabled={!canEdit}
                      className="flex-1 h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-colors px-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">📁 בחר קטגוריה...</option>
                      {categories.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>

                    <div className="flex flex-col gap-2">
                      <label className="flex items-center justify-center h-12 px-4 border-2 border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                        <span className="text-sm font-medium text-gray-700">📷 {newEquipmentImageFile ? newEquipmentImageFile.name : 'בחר תמונה'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              setNewEquipmentImageFile(file)
                            }
                          }}
                          disabled={!canEdit}
                          className="hidden"
                        />
                      </label>
                      {newEquipmentImageFile && (
                        <button
                          type="button"
                          onClick={() => setNewEquipmentImageFile(null)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          ✕ הסר תמונה
                        </button>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={loading || !canEdit}
                      className="h-12 px-8 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                      disabled={!canEdit}
                      className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <label htmlFor="is_consumable" className={`text-sm font-semibold cursor-pointer ${!canEdit ? 'text-gray-400' : 'text-gray-700'}`}>
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
                    {/* Mobile View - Compact */}
                    <div className="block md:hidden space-y-2">
                      {equipment.filter(item =>
                        item.name.toLowerCase().includes(equipmentSearchQuery.toLowerCase())
                      ).map(item => (
                    <div key={item.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
                      {editingEquipment?.id === item.id ? (
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">🎯 שם</label>
                            <Input
                              value={editingEquipment.name}
                              onChange={(e) => setEditingEquipment({ ...editingEquipment, name: e.target.value })}
                              className="w-full h-9 border border-blue-300 rounded-lg text-sm"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">🔢 כמות</label>
                              <Input
                                type="number"
                                value={editingEquipment.quantity}
                                onChange={(e) => setEditingEquipment({ ...editingEquipment, quantity: parseInt(e.target.value) || 0 })}
                                className="w-full h-9 border border-blue-300 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">🔧 סטטוס</label>
                              <select
                                value={editingEquipment.equipment_status}
                                onChange={(e) => setEditingEquipment({ ...editingEquipment, equipment_status: e.target.value as 'working' | 'faulty' })}
                                className="w-full h-9 border border-blue-300 rounded-lg px-2 text-xs font-medium"
                              >
                                <option value="working">✅ תקין</option>
                                <option value="faulty">⚠️ תקול</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">📁 קטגוריה</label>
                              <select
                                value={editingEquipment.category_id || ''}
                                onChange={(e) => setEditingEquipment({ ...editingEquipment, category_id: e.target.value })}
                                className="w-full h-9 border border-blue-300 rounded-lg px-2 text-xs font-medium"
                              >
                                <option value="">ללא</option>
                                {categories.map((cat: any) => (
                                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">📷 תמונה</label>
                              <label className="flex items-center justify-center h-9 px-3 border border-blue-300 rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer">
                                <span className="text-xs font-medium text-gray-700 truncate">
                                  {editingEquipmentImageFile ? editingEquipmentImageFile.name : 'בחר תמונה'}
                                </span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) {
                                      setEditingEquipmentImageFile(file)
                                    }
                                  }}
                                  className="hidden"
                                />
                              </label>
                              {editingEquipmentImageFile && (
                                <button
                                  type="button"
                                  onClick={() => setEditingEquipmentImageFile(null)}
                                  className="text-[10px] text-red-600 hover:text-red-800 mt-1"
                                >
                                  ✕ הסר
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              id={`edit_consumable_${item.id}`}
                              checked={editingEquipment.is_consumable}
                              onChange={(e) => setEditingEquipment({ ...editingEquipment, is_consumable: e.target.checked })}
                              className="w-4 h-4 rounded border border-blue-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor={`edit_consumable_${item.id}`} className="text-xs font-medium text-gray-700 cursor-pointer">
                              🔄 מתכלה
                            </label>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleUpdateEquipment(item.id, editingEquipment.name, editingEquipment.quantity, editingEquipment.equipment_status, editingEquipment.is_consumable, editingEquipment.category_id, editingEquipment.image_url)}
                              disabled={loading}
                              className="flex-1 h-9 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg text-xs"
                            >
                              ✅ שמור
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setEditingEquipment(null)}
                              className="flex-1 h-9 border border-gray-400 rounded-lg text-xs"
                            >
                              ❌ ביטול
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {(item as any).image_url && (item as any).image_url.startsWith('http') ? (
                                <img src={(item as any).image_url} alt={item.name} className="w-8 h-8 object-cover rounded-lg" />
                              ) : (
                                <span className="text-lg">{(item as any).image_url || '📦'}</span>
                              )}
                              <p className="font-bold text-sm text-gray-800 truncate">{item.name}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {(item as any).category && (
                                <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                                  {(item as any).category.name}
                                </span>
                              )}
                              <span className={`text-base font-bold ${item.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {item.quantity}
                              </span>
                              <span className={`text-[10px] font-semibold ${item.equipment_status === 'working' ? 'text-green-600' : 'text-orange-600'}`}>
                                {item.equipment_status === 'working' ? '✅' : '⚠️'}
                              </span>
                              {item.is_consumable && (
                                <span className="text-[10px] font-semibold text-purple-600">
                                  🔄
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Button
                              onClick={() => setEditingEquipment({
                                id: item.id,
                                name: item.name,
                                quantity: item.quantity,
                                equipment_status: item.equipment_status,
                                is_consumable: item.is_consumable,
                                category_id: (item as any).category?.id,
                                image_url: (item as any).image_url
                              })}
                              disabled={!canEdit}
                              className="h-6 px-2 border border-blue-500 text-blue-600 hover:bg-blue-50 bg-white rounded text-[10px] font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              ✏️ ערוך
                            </Button>
                            <Button
                              onClick={() => handleDeleteEquipment(item.id)}
                              disabled={loading || !canEdit}
                              className="h-6 px-2 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white rounded text-[10px] font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <th className="text-center p-4 font-bold text-gray-700">📁 קטגוריה</th>
                        <th className="text-center p-4 font-bold text-gray-700">🎨 אימוג'י</th>
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
                              <select
                                value={editingEquipment.category_id || ''}
                                onChange={(e) => setEditingEquipment({ ...editingEquipment, category_id: e.target.value })}
                                className="w-full h-10 border-2 border-blue-300 rounded-lg px-2 text-sm font-medium"
                              >
                                <option value="">ללא קטגוריה</option>
                                {categories.map((cat: any) => (
                                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-sm font-medium text-blue-600">
                                {(item as any).category?.name || '—'}
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {editingEquipment?.id === item.id ? (
                              <div className="flex flex-col items-center gap-1">
                                <label className="flex items-center justify-center h-10 px-3 border-2 border-blue-300 rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer">
                                  <span className="text-xs font-medium text-gray-700 truncate max-w-[100px]">
                                    {editingEquipmentImageFile ? '✓ נבחרה' : '📷 בחר'}
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) {
                                        setEditingEquipmentImageFile(file)
                                      }
                                    }}
                                    className="hidden"
                                  />
                                </label>
                                {editingEquipmentImageFile && (
                                  <button
                                    type="button"
                                    onClick={() => setEditingEquipmentImageFile(null)}
                                    className="text-[10px] text-red-600 hover:text-red-800"
                                  >
                                    ✕ הסר
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-xl">{(item as any).image_url ? (
                                <img src={(item as any).image_url} alt={item.name} className="w-12 h-12 object-cover rounded-lg mx-auto" />
                              ) : '📦'}</span>
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
                                    onClick={() => handleUpdateEquipment(
                                      item.id,
                                      editingEquipment.name,
                                      editingEquipment.quantity,
                                      editingEquipment.equipment_status,
                                      editingEquipment.is_consumable,
                                      editingEquipment.category_id,
                                      editingEquipment.image_url
                                    )}
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
                                    onClick={() => setEditingEquipment({
                                      id: item.id,
                                      name: item.name,
                                      quantity: item.quantity,
                                      equipment_status: item.equipment_status,
                                      is_consumable: item.is_consumable,
                                      category_id: (item as any).category?.id,
                                      image_url: (item as any).image_url
                                    })}
                                    disabled={!canEdit}
                                    className="border-2 border-blue-500 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    ✏️ ערוך
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeleteEquipment(item.id)}
                                    disabled={loading || !canEdit}
                                    className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
          <>
            {/* Pending Approvals Section */}
            {borrowHistory.filter(item => item.status === 'pending_approval').length > 0 && (
              <Card className="border-0 shadow-2xl rounded-2xl overflow-hidden bg-gradient-to-br from-yellow-50 to-orange-50 mb-6">
                <CardHeader className="bg-gradient-to-r from-yellow-100 to-orange-100 pb-4">
                  <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <span className="text-2xl">⏳</span>
                    החזרות ממתינות לאישור ({borrowHistory.filter(item => item.status === 'pending_approval').length})
                  </CardTitle>
                  <CardDescription className="text-gray-700">
                    אשר או דחה החזרות שצולמו על ידי המשתמשים
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {borrowHistory
                      .filter(item => item.status === 'pending_approval')
                      .map(item => (
                        <div key={item.id} className="bg-white rounded-xl p-4 border-2 border-orange-200 shadow-sm">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg font-bold text-gray-800">{item.equipment_name}</span>
                                {item.equipment_status === 'faulty' && (
                                  <span className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                    ⚠️ דווח כתקול
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 space-y-1">
                                <p><span className="font-semibold">👤 שם:</span> {item.name}</p>
                                <p><span className="font-semibold">📱 טלפון:</span> {item.phone}</p>
                                <p><span className="font-semibold">🕐 הושאל:</span> {new Date(item.borrow_date).toLocaleString('he-IL')}</p>
                                {item.return_date && (
                                  <p><span className="font-semibold">🔙 הוחזר:</span> {new Date(item.return_date).toLocaleString('he-IL')}</p>
                                )}
                                {item.faulty_notes && (
                                  <p className="bg-red-50 p-2 rounded border border-red-200 mt-2">
                                    <span className="font-semibold text-red-800">⚠️ הערות:</span>
                                    <span className="text-red-700"> {item.faulty_notes}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              {item.return_image_url && (
                                <a
                                  href={item.return_image_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-all"
                                >
                                  📷 צפה בתמונה
                                </a>
                              )}
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleApproveReturn(item.id, true)}
                                  disabled={loading || !canEdit}
                                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold"
                                  size="sm"
                                >
                                  ✅ אשר
                                </Button>
                                <Button
                                  onClick={() => handleApproveReturn(item.id, false)}
                                  disabled={loading || !canEdit}
                                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold"
                                  size="sm"
                                >
                                  ❌ דחה
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* History Section */}
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
                                    : item.status === 'pending_approval'
                                    ? 'bg-yellow-50 border-yellow-200'
                                    : 'bg-green-50 border-green-200'
                                }`}>
                                  <div className="flex-1">
                                    <p className="font-semibold text-gray-800">{item.equipment_name}</p>
                                  </div>
                                  <div className="flex gap-2 items-center">
                                    {item.status !== 'pending_approval' && (
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleUpdateHistoryStatus(
                                            item.id,
                                            item.status === 'borrowed' ? 'returned' : 'borrowed'
                                          )
                                        }}
                                        disabled={loading}
                                        className={`h-8 px-3 text-xs font-semibold rounded-lg transition-all ${
                                          item.status === 'borrowed'
                                            ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                            : 'bg-green-500 hover:bg-green-600 text-white'
                                        }`}
                                        title={item.status === 'borrowed' ? 'סמן כהוחזר' : 'סמן כהושאל'}
                                      >
                                        {item.status === 'borrowed' ? '⏳ מושאל' : '✅ הוחזר'}
                                      </Button>
                                    )}
                                    {item.status === 'pending_approval' && (
                                      <span className="inline-block px-3 py-1 bg-yellow-500 text-white text-xs font-semibold rounded-lg">
                                        ⏳ ממתין לאישור
                                      </span>
                                    )}
                                    {(item.status === 'returned' || item.status === 'pending_approval') && item.return_image_url && (
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          window.open(item.return_image_url!, '_blank')
                                        }}
                                        className="h-8 px-3 text-xs font-semibold rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-all"
                                        title="צפה בתמונת החזרה"
                                      >
                                        📷 תמונה
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteHistory(item.id)
                                      }}
                                      disabled={loading || !canEdit}
                                      className="h-8 px-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                    <div className="flex flex-col gap-1">
                                      <span className="text-xs font-medium text-gray-700">
                                        {item.equipment_name}
                                      </span>
                                      <div className="flex gap-1 items-center">
                                        {item.status !== 'pending_approval' && (
                                          <Button
                                            size="sm"
                                            onClick={() => handleUpdateHistoryStatus(item.id, item.status === 'borrowed' ? 'returned' : 'borrowed')}
                                            disabled={loading}
                                            className={`h-7 px-2 text-xs font-semibold rounded transition-all ${
                                              item.status === 'borrowed'
                                                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                                : 'bg-green-500 hover:bg-green-600 text-white'
                                            }`}
                                            title={item.status === 'borrowed' ? 'סמן כהוחזר' : 'סמן כהושאל'}
                                          >
                                            {item.status === 'borrowed' ? '⏳ מושאל' : '✅ הוחזר'}
                                          </Button>
                                        )}
                                        {item.status === 'pending_approval' && (
                                          <span className="inline-block px-2 py-1 bg-yellow-500 text-white text-xs font-semibold rounded">
                                            ⏳ ממתין
                                          </span>
                                        )}
                                        {(item.status === 'returned' || item.status === 'pending_approval') && item.return_image_url && (
                                          <Button
                                            size="sm"
                                            onClick={() => window.open(item.return_image_url!, '_blank')}
                                            className="h-7 px-2 text-xs font-semibold rounded bg-blue-500 hover:bg-blue-600 text-white transition-all"
                                            title="צפה בתמונת החזרה"
                                          >
                                            📷
                                          </Button>
                                        )}
                                      </div>
                                    </div>
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
                                  <div key={item.id} className="flex items-center gap-1">
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
                                    <Button
                                      key={item.id}
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteHistory(item.id)}
                                      disabled={loading || !canEdit}
                                      className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                      title={`מחק: ${item.equipment_name}`}
                                    >
                                      🗑️
                                    </Button>
                                  </div>
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
          </>
        )}

        {activeTab === 'requests' && city && (
          <RequestsTab
            cityId={cityId}
            cityName={city.name}
            managerName={currentUser?.full_name || currentUser?.email || city.manager1_name}
            onRequestsUpdate={fetchPendingRequestsCount}
            canApprove={canApprove}
            canEdit={canEdit}
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
                        // Check permissions
                        if (!canEdit) {
                          alert('אין לך הרשאה לבצע פעולה זו - נדרשת הרשאת עריכה מלאה')
                          return
                        }

                        if (city?.request_mode === 'direct') {
                          alert('המערכת כבר במצב השאלה ישירה')
                          return
                        }

                        if (confirm('האם להחליף למצב השאלה ישירה? משתמשים יוכלו לשאול ציוד מיידית ללא אישור')) {
                          try {
                            const response = await fetch('/api/city/update-details', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({
                                cityId,
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
                      disabled={!canEdit}
                      className={`p-6 rounded-xl border-2 font-semibold transition-all text-right ${
                        city?.request_mode === 'direct'
                          ? 'bg-green-100 border-green-500 shadow-lg scale-105'
                          : 'bg-white border-gray-300 hover:border-green-300'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
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
                        // Check permissions
                        if (!canEdit) {
                          alert('אין לך הרשאה לבצע פעולה זו - נדרשת הרשאת עריכה מלאה')
                          return
                        }

                        if (city?.request_mode === 'request') {
                          alert('המערכת כבר במצב בקשות')
                          return
                        }

                        if (confirm('האם להחליף למצב בקשות? משתמשים ישלחו בקשות שידרשו אישור מנהל')) {
                          try {
                            const response = await fetch('/api/city/update-details', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({
                                cityId,
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
                      disabled={!canEdit}
                      className={`p-6 rounded-xl border-2 font-semibold transition-all text-right ${
                        city?.request_mode === 'request'
                          ? 'bg-purple-100 border-purple-500 shadow-lg scale-105'
                          : 'bg-white border-gray-300 hover:border-purple-300'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
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
                        <label className={`block text-sm font-semibold ${!canEdit ? 'text-gray-400' : 'text-gray-700'}`}>🔐 קוד ארון (אופציונלי)</label>
                        <p className="text-xs text-gray-500 mb-2">קוד זה יוצג למבקש רק לאחר שהבקשה אושרה</p>
                        <Input
                          type="text"
                          value={city.cabinet_code || ''}
                          disabled={!canEdit}
                          onChange={(e) => {
                            if (!canEdit) {
                              alert('אין לך הרשאה לערוך קוד ארון - נדרשת הרשאת עריכה מלאה')
                              return
                            }
                            // Update local state immediately
                            setCity({ ...city, cabinet_code: e.target.value })
                          }}
                          onBlur={async (e) => {
                            if (!canEdit) return
                            // Save to server when user finishes editing
                            try {
                              const response = await fetch('/api/city/update-details', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
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
                            // Check permissions
                            if (!canEdit) {
                              alert('אין לך הרשאה לבצע פעולה זו - נדרשת הרשאת עריכה מלאה')
                              return
                            }

                            const newValue = !city.require_call_id

                            // Update local state immediately for instant feedback
                            setCity({ ...city, require_call_id: newValue })

                            try {
                              const response = await fetch('/api/city/update-details', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({
                                  cityId,
                                  require_call_id: newValue
                                })
                              })

                              if (response.ok) {
                                alert(newValue ? '✅ מזהה קריאה חובה' : '❌ מזהה קריאה אופציונלי')
                                fetchCity() // Refresh to ensure sync
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

                {/* Hide Navigation Toggle */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 border-2 border-amber-200">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">🗺️ הצגת ניווט בדף השאלות</h3>
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl">
                    <div>
                      <div className="font-semibold text-gray-800">הסתר כפתורי ניווט (Google Maps / Waze)</div>
                      <div className="text-sm text-gray-500">הסתר אפשרויות ניווט מדף השאלות - פרטי המנהלים יישארו גלויים</div>
                    </div>
                    <button
                      onClick={async () => {
                        // Check permissions
                        if (!canEdit) {
                          alert('אין לך הרשאה לבצע פעולה זו - נדרשת הרשאת עריכה מלאה')
                          return
                        }

                        const newValue = !city?.hide_navigation
                        console.log('🔄 Toggling hide_navigation:', { current: city?.hide_navigation, new: newValue, cityId })

                        // Update local state immediately for instant feedback
                        setCity({ ...city!, hide_navigation: newValue })

                        try {
                          const response = await fetch('/api/city/update-details', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({
                              cityId,
                              hide_navigation: newValue
                            })
                          })

                          const data = await response.json()
                          console.log('📡 Server response:', { status: response.status, data })

                          if (response.ok) {
                            alert(newValue ? '✅ ניווט הוסתר' : '✅ ניווט מוצג')
                            fetchCity() // Refresh to ensure sync
                          } else {
                            // Revert on error
                            console.error('❌ Update failed:', data)
                            alert(`שגיאה בעדכון: ${data.error || 'שגיאה לא ידועה'}`)
                            fetchCity()
                          }
                        } catch (error) {
                          console.error('❌ Error updating hide_navigation:', error)
                          alert('שגיאה בעדכון')
                          fetchCity() // Revert to server value
                        }
                      }}
                      className={`px-6 py-2 rounded-xl font-semibold transition-all ${
                        city?.hide_navigation
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}
                    >
                      {city?.hide_navigation ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>

                {/* Enable Push Notifications Toggle */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">🔔 התראות דחיפה (Push Notifications)</h3>
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl">
                    <div>
                      <div className="font-semibold text-gray-800">אפשר התראות דחיפה עבור העיר</div>
                      <div className="text-sm text-gray-500">כאשר מופעל, מנהלי העיר יוכלו להירשם להתראות על בקשות חדשות</div>
                    </div>
                    <button
                      onClick={async () => {
                        const newValue = !city?.enable_push_notifications

                        // Update local state immediately for instant feedback
                        setCity({ ...city!, enable_push_notifications: newValue })

                        try {
                          const response = await fetch('/api/city/update-details', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({
                              cityId,
                              enable_push_notifications: newValue
                            })
                          })

                          if (response.ok) {
                            alert(newValue ? '✅ התראות הופעלו' : '✅ התראות כובו')
                          } else {
                            // Revert on error
                            alert('שגיאה בעדכון')
                            fetchCity()
                          }
                        } catch (error) {
                          console.error('Error updating enable_push_notifications:', error)
                          alert('שגיאה בעדכון')
                          fetchCity() // Revert to server value
                        }
                      }}
                      className={`px-6 py-2 rounded-xl font-semibold transition-all ${
                        city?.enable_push_notifications
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}
                    >
                      {city?.enable_push_notifications ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>

                {/* Copy Equipment Section */}
                {!showCopyEquipment ? (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">📋 העתק ציוד מעיר אחרת</h3>
                        <p className="text-sm text-gray-600">טען רשימת ציוד מוכנה מעיר קיימת - חיסכון בזמן לערים חדשות</p>
                        {!canEdit && (
                          <p className="text-xs text-red-600 mt-1">⚠️ נדרשת הרשאת עריכה מלאה</p>
                        )}
                      </div>
                      <Button
                        onClick={() => setShowCopyEquipment(true)}
                        disabled={!canEdit}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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

                          {/* Location Image Upload */}
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">🖼️ תמונת מיקום הארון</label>
                            <div className="space-y-3">
                              {editCityForm.location_image && (
                                <div className="relative">
                                  <img
                                    src={editCityForm.location_image}
                                    alt="תמונת מיקום הארון"
                                    className="w-full max-w-md rounded-lg border-2 border-gray-200"
                                  />
                                  {isEditingLocation && (
                                    <button
                                      type="button"
                                      onClick={() => setEditCityForm({ ...editCityForm, location_image: null })}
                                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg"
                                    >
                                      🗑️ הסר תמונה
                                    </button>
                                  )}
                                </div>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                disabled={!isEditingLocation}
                                onChange={async (e) => {
                                  if (!isEditingLocation) return
                                  const file = e.target.files?.[0]
                                  if (!file) return

                                  try {
                                    setLoading(true)
                                    // Compress and convert image
                                    const compressedBase64 = await new Promise<string>((resolve, reject) => {
                                      const reader = new FileReader()
                                      reader.onload = (event) => {
                                        const img = new Image()
                                        img.onload = () => {
                                          const canvas = document.createElement('canvas')
                                          let width = img.width
                                          let height = img.height

                                          // Resize if larger than 1920px
                                          const maxSize = 1920
                                          if (width > height && width > maxSize) {
                                            height = (height * maxSize) / width
                                            width = maxSize
                                          } else if (height > maxSize) {
                                            width = (width * maxSize) / height
                                            height = maxSize
                                          }

                                          canvas.width = width
                                          canvas.height = height
                                          const ctx = canvas.getContext('2d')!
                                          ctx.drawImage(img, 0, 0, width, height)

                                          // Convert to JPEG with 85% quality
                                          const compressed = canvas.toDataURL('image/jpeg', 0.85)

                                          // Check final size (max 2MB after compression)
                                          const sizeInMB = (compressed.length * 3) / 4 / (1024 * 1024)
                                          if (sizeInMB > 2) {
                                            reject(new Error('התמונה גדולה מדי גם אחרי דחיסה. נסה תמונה קטנה יותר.'))
                                            return
                                          }

                                          resolve(compressed)
                                        }
                                        img.onerror = () => reject(new Error('שגיאה בטעינת התמונה'))
                                        img.src = event.target!.result as string
                                      }
                                      reader.onerror = () => reject(new Error('שגיאה בקריאת הקובץ'))
                                      reader.readAsDataURL(file)
                                    })

                                    setEditCityForm({ ...editCityForm, location_image: compressedBase64 })
                                    setLoading(false)
                                  } catch (error: any) {
                                    setLoading(false)
                                    alert(error.message || 'שגיאה בהעלאת התמונה')
                                  }
                                }}
                                className={`block w-full text-sm border-2 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold ${
                                  isEditingLocation
                                    ? 'file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 border-gray-200 cursor-pointer'
                                    : 'file:bg-gray-100 file:text-gray-400 border-gray-100 cursor-not-allowed'
                                }`}
                              />
                              <p className="text-xs text-gray-500">תמונה של הארון - תוצג בדף הטוקן (עד 2MB, אופציונלי)</p>
                            </div>
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
                                  ? 'border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
                                  : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                              }`}
                              disabled={!isEditingLocation}
                            />
                            <p className="text-xs text-gray-500">תיאור טקסט חופשי למיקום המדויק - יוצג בדף הטוקן (אופציונלי)</p>
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

        {/* Account Settings Modal */}
        {showAccountSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-800">⚙️ הגדרות חשבון</h2>
                <p className="text-gray-600 mt-1">עדכון פרטים אישיים ושינוי סיסמה</p>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault()

                  // Validate passwords if user wants to change password
                  if (accountForm.new_password || accountForm.confirm_password) {
                    if (accountForm.new_password !== accountForm.confirm_password) {
                      alert('הסיסמה החדשה ואישור הסיסמה אינם תואמים')
                      return
                    }
                    if (accountForm.new_password.length < 6) {
                      alert('הסיסמה החדשה חייבת להיות באורך 6 תווים לפחות')
                      return
                    }
                    if (!accountForm.current_password) {
                      alert('יש להזין את הסיסמה הנוכחית כדי לשנות סיסמה')
                      return
                    }
                  }

                  setLoading(true)
                  try {
                    const response = await fetch('/api/user/update-account', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        full_name: accountForm.full_name,
                        phone: accountForm.phone,
                        current_password: accountForm.current_password || undefined,
                        new_password: accountForm.new_password || undefined
                      })
                    })

                    const data = await response.json()

                    if (data.success) {
                      alert('✅ הפרטים עודכנו בהצלחה!')
                      setShowAccountSettings(false)

                      // Refresh current user data
                      const authResult = await checkAuth()
                      console.log('🔄 Refreshed user data:', authResult.user)
                      setCurrentUser(authResult.user)

                      // Verify the update
                      console.log('✅ Updated currentUser:', {
                        full_name: authResult.user?.full_name,
                        phone: authResult.user?.phone,
                        email: authResult.user?.email
                      })
                    } else {
                      alert(`❌ ${data.error || 'שגיאה בעדכון הפרטים'}`)
                    }
                  } catch (error) {
                    console.error('Error updating account:', error)
                    alert('❌ שגיאה בעדכון הפרטים')
                  } finally {
                    setLoading(false)
                  }
                }}
                className="p-6 space-y-6"
              >
                {/* Personal Info Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800 border-b pb-2">👤 פרטים אישיים</h3>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      שם מלא <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={accountForm.full_name}
                      onChange={(e) => setAccountForm({ ...accountForm, full_name: e.target.value })}
                      required
                      className="h-12 text-base border-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      טלפון <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="tel"
                      value={accountForm.phone}
                      onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })}
                      required
                      className="h-12 text-base border-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      אימייל
                    </label>
                    <Input
                      type="email"
                      value={accountForm.email}
                      disabled
                      className="h-12 text-base border-2 bg-gray-100 cursor-not-allowed"
                      title="לא ניתן לשנות את כתובת המייל"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      לא ניתן לשנות את כתובת המייל. ליצירת קשר עם מנהל המערכת.
                    </p>
                  </div>
                </div>

                {/* Password Section */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-bold text-gray-800 border-b pb-2">🔐 שינוי סיסמה (אופציונלי)</h3>
                  <p className="text-sm text-gray-600">
                    השאר ריק אם אינך רוצה לשנות את הסיסמה
                  </p>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      סיסמה נוכחית
                    </label>
                    <Input
                      type="password"
                      value={accountForm.current_password}
                      onChange={(e) => setAccountForm({ ...accountForm, current_password: e.target.value })}
                      className="h-12 text-base border-2"
                      autoComplete="current-password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      סיסמה חדשה
                    </label>
                    <Input
                      type="password"
                      value={accountForm.new_password}
                      onChange={(e) => setAccountForm({ ...accountForm, new_password: e.target.value })}
                      className="h-12 text-base border-2"
                      autoComplete="new-password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      אישור סיסמה חדשה
                    </label>
                    <Input
                      type="password"
                      value={accountForm.confirm_password}
                      onChange={(e) => setAccountForm({ ...accountForm, confirm_password: e.target.value })}
                      className="h-12 text-base border-2"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl"
                  >
                    {loading ? '⏳ שומר...' : '💾 שמור שינויים'}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowAccountSettings(false)}
                    variant="outline"
                    className="flex-1 h-12 border-2 border-gray-300"
                  >
                    ביטול
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
