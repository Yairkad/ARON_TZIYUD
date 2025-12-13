'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { Equipment, BorrowHistory, City } from '@/types'
import { FileDown, Bell, BellOff } from 'lucide-react'
import Logo from '@/components/Logo'
import { checkAuth, logout } from '@/lib/auth'
import {
  isPushSupported,
  hasNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed,
  getPushNotSupportedReason
} from '@/lib/push'
import toast from 'react-hot-toast'
import { VERSION } from '@/lib/version'

// Lazy load heavy components for better performance
const RequestsTab = dynamic(() => import('@/components/RequestsTab'), {
  ssr: false,
  loading: () => <div className="p-4 text-center text-gray-500">טוען בקשות...</div>
})

const ReportsTab = dynamic(() => import('@/components/ReportsTab'), {
  ssr: false,
  loading: () => <div className="p-4 text-center text-gray-500">טוען דוחות...</div>
})

const EquipmentPoolModal = dynamic(() => import('@/components/EquipmentPoolModal'), {
  ssr: false,
  loading: () => <div className="p-4 text-center text-gray-500">טוען...</div>
})

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
  const searchParams = useSearchParams()
  const cityId = params.cityId as string

  // Get initial tab from URL query parameter
  const urlTab = searchParams.get('tab') as 'equipment' | 'history' | 'requests' | 'reports' | 'settings' | null

  const [city, setCity] = useState<City | null>(null)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [borrowHistory, setBorrowHistory] = useState<BorrowHistory[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true) // Add loading state for auth check
  const [isRedirecting, setIsRedirecting] = useState(false) // Prevent multiple redirects
  const [isBlocked, setIsBlocked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'equipment' | 'history' | 'requests' | 'reports' | 'settings'>(urlTab || 'equipment')
  const [newEquipment, setNewEquipment] = useState({ name: '', quantity: 1, equipment_status: 'working' as 'working' | 'faulty', is_consumable: false, category_id: '', image_url: '' })
  const [editingEquipment, setEditingEquipment] = useState<{ id: string; name: string; quantity: number; equipment_status: 'working' | 'faulty'; is_consumable: boolean; category_id?: string; image_url?: string } | null>(null)
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
  const [showEquipmentPoolModal, setShowEquipmentPoolModal] = useState(false)
  const [showManualAddForm, setShowManualAddForm] = useState(false)
  const [globalPoolSuggestions, setGlobalPoolSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [globalPoolCache, setGlobalPoolCache] = useState<any[]>([])
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [isEditingLocation, setIsEditingLocation] = useState(false)
  const [hasCityFormChanges, setHasCityFormChanges] = useState(false)
  const [showRequestsNotification, setShowRequestsNotification] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushSupported, setPushSupported] = useState(false)
  const [pushNotSupportedReason, setPushNotSupportedReason] = useState<string | null>(null)
  const [enablingPush, setEnablingPush] = useState(false)
  const [isCityDetailsExpanded, setIsCityDetailsExpanded] = useState(false)
  const [equipmentSearchQuery, setEquipmentSearchQuery] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [managerRole, setManagerRole] = useState<'manager1' | 'manager2' | null>(null)
  const [distanceSaveTimer, setDistanceSaveTimer] = useState<NodeJS.Timeout | null>(null)
  const [distanceSaveStatus, setDistanceSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [showAccountSettings, setShowAccountSettings] = useState(false)
  const [accountSettingsTab, setAccountSettingsTab] = useState<'details' | 'password'>('details')
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [volunteerViewMode, setVolunteerViewMode] = useState(false)
  const [showClosureConfirm, setShowClosureConfirm] = useState(false)
  const [showImageNotAvailable, setShowImageNotAvailable] = useState(false)
  const [checkingImage, setCheckingImage] = useState(false)

  // Confirmation Modal State - Generic modal for all confirmations
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean
    title: string
    message: string
    icon: string
    confirmText: string
    confirmColor: 'red' | 'green' | 'blue' | 'orange'
    onConfirm: () => void
    loading?: boolean
  } | null>(null)

  // Helper function to show confirmation modal
  const showConfirmModal = (config: {
    title: string
    message: string
    icon: string
    confirmText: string
    confirmColor: 'red' | 'green' | 'blue' | 'orange'
    onConfirm: () => void
  }) => {
    setConfirmModal({ show: true, ...config, loading: false })
  }

  const closeConfirmModal = () => {
    setConfirmModal(null)
  }

  // Function to check if image exists and open it or show "not available" popup
  const openReturnImage = async (imageUrl: string) => {
    setCheckingImage(true)
    try {
      // Try to fetch the image with HEAD request to check if it exists
      const response = await fetch(imageUrl, { method: 'HEAD' })
      if (response.ok) {
        // Image exists, open it
        window.open(imageUrl, '_blank')
      } else {
        // Image doesn't exist (404 or other error)
        setShowImageNotAvailable(true)
      }
    } catch (error) {
      // Network error or CORS issue - try opening directly
      // If it fails, the browser will show its own error
      // But for Vercel Blob, we can assume it's deleted
      setShowImageNotAvailable(true)
    } finally {
      setCheckingImage(false)
    }
  }

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

  // Update active tab when URL changes (for navigation from push notifications)
  useEffect(() => {
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab])

  useEffect(() => {
    if (isAuthenticated && cityId && currentUser) {
      fetchCity()
      fetchData()
      fetchAllCities()
      fetchPendingRequestsCount()
      fetchCategories()
      fetchGlobalPoolForSuggestions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, cityId, currentUser])

  // Fetch global pool for autocomplete suggestions
  const fetchGlobalPoolForSuggestions = async () => {
    try {
      const response = await fetch('/api/global-equipment?status=active&includeCategories=true')
      if (response.ok) {
        const data = await response.json()
        setGlobalPoolCache(data.equipment || [])
      }
    } catch (error) {
      console.error('Error fetching global pool:', error)
    }
  }

  // Filter suggestions based on input
  const handleEquipmentNameChange = (value: string) => {
    setNewEquipment({ ...newEquipment, name: value })

    if (value.trim().length >= 2) {
      // Filter global pool items that match the search and aren't already in this city
      const existingNames = equipment.map(e => e.name.toLowerCase())
      const suggestions = globalPoolCache.filter(item =>
        item.name.toLowerCase().includes(value.toLowerCase()) &&
        !existingNames.includes(item.name.toLowerCase())
      ).slice(0, 5)

      setGlobalPoolSuggestions(suggestions)
      setShowSuggestions(suggestions.length > 0)
    } else {
      setGlobalPoolSuggestions([])
      setShowSuggestions(false)
    }
  }

  // Select a suggestion from the dropdown
  const selectSuggestion = (item: any) => {
    setNewEquipment({
      ...newEquipment,
      name: item.name,
      category_id: item.category_id || '',
      image_url: item.image_url || ''
    })
    setShowSuggestions(false)
  }

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

      // Get the reason if not supported (for iOS message)
      if (!supported) {
        const reason = getPushNotSupportedReason()
        setPushNotSupportedReason(reason)
      }

      if (supported && isAuthenticated) {
        const subscribed = await isSubscribed()
        setPushEnabled(subscribed)
      }
    }

    checkPushStatus()
  }, [isAuthenticated])

  const fetchCity = async () => {
    try {
      // Fetch city without is_active filter - we'll check permissions after
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .eq('id', cityId)
        .single()

      if (error) {
        console.error('Error fetching city:', error)
      } else {
        // If city is inactive, only super_admin can access it
        if (!data.is_active && currentUser?.role !== 'super_admin') {
          console.log('❌ Access denied - city is inactive and user is not super admin')
          setCity(null)
          return
        }
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
        setHasCityFormChanges(false)
      }
    } catch (error) {
      console.error('Error fetching city:', error)
    }
  }

  const fetchData = async () => {
    await Promise.all([fetchEquipment(), fetchHistory()])
  }

  const fetchEquipment = async () => {
    console.log('📦 Fetching equipment for city:', cityId)
    try {
      const response = await fetch(`/api/city-equipment?cityId=${cityId}`)
      const result = await response.json()

      console.log('📦 Equipment API result:', { count: result.equipment?.length, error: result.error })

      if (!response.ok) {
        console.error('Error fetching equipment:', result.error)
        return
      }

      // Map to Equipment format for backward compatibility
      const mappedData = (result.equipment || []).map((item: any) => ({
        id: item.id,
        name: item.global_equipment?.name || '',
        quantity: item.quantity,
        city_id: item.city_id,
        equipment_status: item.equipment_status || 'working',
        is_consumable: item.is_consumable || false,
        category_id: item.global_equipment?.category_id,
        image_url: item.global_equipment?.image_url,
        display_order: item.display_order,
        created_at: item.created_at,
        updated_at: item.updated_at,
        category: item.global_equipment?.category,
        global_equipment_id: item.global_equipment_id
      }))
      console.log('📦 Equipment mapped:', mappedData.length, 'items')
      setEquipment(mappedData)
    } catch (error) {
      console.error('Error fetching equipment:', error)
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
      .or('is_hidden.is.null,is_hidden.eq.false') // Filter out hidden records
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

          const data = await response.json()

          if (response.ok) {
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
          } else if (response.status === 403 && data.error === 'המשתמש לא פעיל') {
            console.log('🚫 User is blocked')
            setIsBlocked(true)
            setCurrentUser(null)
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

  // Handle redirect to login when not authenticated (use useEffect to avoid render loop)
  useEffect(() => {
    if (!isCheckingAuth && !isAuthenticated && !isBlocked && !isRedirecting) {
      setIsRedirecting(true)
      router.push('/login')
    }
  }, [isCheckingAuth, isAuthenticated, isBlocked, isRedirecting, router])

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check permissions
    if (!canEdit) {
      toast.error('אין לך הרשאה לבצע פעולה זו - נדרשת הרשאת עריכה מלאה')
      return
    }

    if (!newEquipment.name || newEquipment.quantity < 0) {
      toast.error('אנא מלא שם וכמות תקינים')
      return
    }

    setLoading(true)
    try {
      // Step 1: Check if equipment exists in global pool, or create it via API
      let globalEquipmentId: string

      // First check if exists
      const checkResponse = await fetch(`/api/global-equipment?status=active`)
      const checkData = await checkResponse.json()
      const existingGlobal = checkData.equipment?.find(
        (eq: any) => eq.name.toLowerCase() === newEquipment.name.trim().toLowerCase()
      )

      if (existingGlobal) {
        globalEquipmentId = existingGlobal.id
      } else {
        // Create new global equipment via API (handles RLS properly)
        const createResponse = await fetch('/api/global-equipment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newEquipment.name.trim(),
            category_id: newEquipment.category_id || null,
            image_url: newEquipment.image_url || null,
            is_consumable: newEquipment.is_consumable
          })
        })

        if (!createResponse.ok) {
          const errorData = await createResponse.json()
          throw new Error(errorData.error || 'שגיאה ביצירת ציוד במאגר')
        }

        const createData = await createResponse.json()
        globalEquipmentId = createData.equipment.id
      }

      // Step 2: Link to city using API
      const response = await fetch('/api/city-equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city_id: cityId,
          global_equipment_id: globalEquipmentId,
          quantity: newEquipment.quantity,
          equipment_status: newEquipment.equipment_status,
          is_consumable: newEquipment.is_consumable
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'שגיאה בהוספת ציוד')
      }

      toast.success('הציוד נוסף בהצלחה!')
      setNewEquipment({ name: '', quantity: 1, equipment_status: 'working', is_consumable: false, category_id: '', image_url: '' })
      fetchEquipment()
    } catch (error: any) {
      console.error('Error adding equipment:', error)
      toast.error(error.message || 'אירעה שגיאה בהוספת הציוד')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateEquipment = async (id: string, name: string, quantity: number, equipment_status: 'working' | 'faulty', is_consumable: boolean, category_id?: string, image_url?: string) => {
    // Check permissions
    if (!canEdit) {
      toast.error('אין לך הרשאה לבצע פעולה זו - נדרשת הרשאת עריכה מלאה')
      return
    }

    if (!name || quantity < 0) {
      toast.error('אנא מלא שם וכמות תקינים')
      return
    }

    setLoading(true)
    try {
      console.log('🔧 Updating equipment:', { id, name, quantity, equipment_status, is_consumable, image_url })

      // Find the equipment to get its global_equipment_id
      const equipmentItem = equipment.find(e => e.city_equipment_id === id || e.id === id)
      const globalEquipmentId = equipmentItem?.global_equipment_id || equipmentItem?.id

      // Update city_equipment using API (quantity, status, consumable)
      const response = await fetch('/api/city-equipment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          quantity,
          equipment_status,
          is_consumable
        })
      })

      const data = await response.json()
      console.log('🔧 City equipment update response:', data)

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בעדכון ציוד')
      }

      // If image_url was provided, update it in global_equipment_pool
      if (image_url !== undefined && globalEquipmentId) {
        console.log('🖼️ Updating image for global equipment:', globalEquipmentId)
        const imageResponse = await fetch('/api/global-equipment', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: globalEquipmentId,
            image_url
          })
        })

        const imageData = await imageResponse.json()
        console.log('🖼️ Image update response:', imageData)

        if (!imageResponse.ok) {
          // Don't fail the whole operation, just warn
          console.warn('Warning: Could not update image:', imageData.error)
        }
      }

      toast.success('הציוד עודכן בהצלחה!')
      setEditingEquipment(null)
      fetchEquipment()
    } catch (error: any) {
      console.error('Error updating equipment:', error)
      toast.error(error.message || 'אירעה שגיאה בעדכון הציוד')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEquipment = async (id: string) => {
    // Check permissions
    if (!canEdit) {
      toast.error('אין לך הרשאה לבצע פעולה זו - נדרשת הרשאת עריכה מלאה')
      return
    }

    showConfirmModal({
      title: 'מחיקת פריט',
      message: 'האם אתה בטוח שברצונך למחוק פריט זה?',
      icon: '🗑️',
      confirmText: 'מחק',
      confirmColor: 'red',
      onConfirm: async () => {
        setConfirmModal(prev => prev ? { ...prev, loading: true } : null)
        try {
          const response = await fetch(`/api/city-equipment?id=${id}`, {
            method: 'DELETE'
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'שגיאה במחיקה')
          }

          toast.success('הציוד נמחק בהצלחה!')
          fetchEquipment()
        } catch (error: any) {
          console.error('Error deleting equipment:', error)
          toast.error('אירעה שגיאה במחיקת הציוד: ' + error.message)
        } finally {
          closeConfirmModal()
        }
      }
    })
  }

  const handleUpdateHistoryStatus = async (id: string, status: 'borrowed' | 'returned') => {
    setLoading(true)
    try {
      // Get the borrow record to find the equipment_id (now global_equipment_id)
      const { data: borrowRecord, error: fetchError } = await supabase
        .from('borrow_history')
        .select('*, equipment_id, global_equipment_id')
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

      // Find the equipment in our local state - ID is global_equipment_id
      const globalEquipmentId = borrowRecord.global_equipment_id || borrowRecord.equipment_id
      const equipmentItem = equipment.find(eq => eq.id === globalEquipmentId || eq.global_equipment_id === globalEquipmentId)

      // If status changed to 'returned', increment equipment quantity
      if (status === 'returned' && equipmentItem) {
        const response = await fetch('/api/city-equipment', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: equipmentItem.id,
            quantity: equipmentItem.quantity + 1
          })
        })
        if (!response.ok) {
          console.error('Failed to update quantity')
        }
      }

      // If status changed to 'borrowed', decrement equipment quantity
      if (status === 'borrowed' && equipmentItem && borrowRecord.status === 'returned') {
        if (equipmentItem.quantity > 0) {
          const response = await fetch('/api/city-equipment', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: equipmentItem.id,
              quantity: equipmentItem.quantity - 1
            })
          })
          if (!response.ok) {
            console.error('Failed to update quantity')
          }
        }
      }

      fetchHistory()
      fetchEquipment() // Refresh equipment to show updated quantity
    } catch (error) {
      console.error('Error updating history:', error)
      toast.error('אירעה שגיאה בעדכון ההיסטוריה')
    } finally {
      setLoading(false)
    }
  }

  // Approve or reject return - internal execution function
  const executeApproveReturn = async (id: string, approve: boolean) => {
    setLoading(true)
    try {
      // Get the borrow record to find the equipment_id and status
      const { data: borrowRecord, error: fetchError } = await supabase
        .from('borrow_history')
        .select('*, equipment_id, global_equipment_id')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      if (borrowRecord.status !== 'pending_approval') {
        toast.error('רשומה זו אינה ממתינה לאישור')
        return
      }

      // Find the equipment in our local state
      const globalEquipmentId = borrowRecord.global_equipment_id || borrowRecord.equipment_id
      const equipmentItem = equipment.find(eq => eq.id === globalEquipmentId || eq.global_equipment_id === globalEquipmentId)

      if (approve) {
        // Approve return - update status to 'returned' and restore quantity
        const { error: updateError } = await supabase
          .from('borrow_history')
          .update({ status: 'returned' })
          .eq('id', id)

        if (updateError) throw updateError

        // Restore equipment quantity using city_equipment API
        if (equipmentItem) {
          const response = await fetch('/api/city-equipment', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: equipmentItem.id,
              quantity: equipmentItem.quantity + 1
            })
          })

          if (!response.ok) {
            console.error('Failed to update quantity')
          }
        }

        toast.success('ההחזרה אושרה והציוד חזר למלאי!')
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

        toast.error('ההחזרה נדחתה. הציוד חזר למצב "מושאל".')
      }

      fetchHistory()
      fetchEquipment() // Refresh equipment to show updated quantity
    } catch (error) {
      console.error('Error approving/rejecting return:', error)
      toast.error('אירעה שגיאה בטיפול בהחזרה')
    } finally {
      setLoading(false)
    }
  }

  // Approve or reject return - with confirmation for reject
  const handleApproveReturn = async (id: string, approve: boolean) => {
    if (!approve) {
      // Show confirmation modal for rejection
      showConfirmModal({
        title: 'דחיית החזרה',
        message: 'האם אתה בטוח שברצונך לדחות את ההחזרה? הציוד יישאר במצב "מושאל".',
        icon: '⚠️',
        confirmText: 'דחה',
        confirmColor: 'orange',
        onConfirm: async () => {
          setConfirmModal(prev => prev ? { ...prev, loading: true } : null)
          await executeApproveReturn(id, false)
          closeConfirmModal()
        }
      })
      return
    }

    // Approve - no confirmation needed
    await executeApproveReturn(id, true)
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
      toast.error('שגיאה בייצוא לאקסל')
    }
  }

  // Soft delete - hide from history but keep for reports
  const handleDeleteHistory = async (id: string) => {
    // Check permissions
    if (!canEdit) {
      toast.error('אין לך הרשאה לבצע פעולה זו - נדרשת הרשאת עריכה מלאה')
      return
    }

    showConfirmModal({
      title: 'הסתרת רשומה',
      message: 'הרשומה תוסתר מההיסטוריה אך תישמר בדוחות הסטטיסטיקה. להמשיך?',
      icon: '👁️‍🗨️',
      confirmText: 'הסתר',
      confirmColor: 'orange',
      onConfirm: async () => {
        setConfirmModal(prev => prev ? { ...prev, loading: true } : null)
        try {
          const { error } = await supabase
            .from('borrow_history')
            .update({ is_hidden: true })
            .eq('id', id)

          if (error) throw error

          toast.success('הרשומה הוסתרה בהצלחה!')
          fetchHistory()
        } catch (error) {
          console.error('Error hiding history:', error)
          toast.error('אירעה שגיאה בהסתרת הרשומה')
        } finally {
          closeConfirmModal()
        }
      }
    })
  }

  const handleUpdateCityDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!city) return

    // Check permissions
    if (!canEdit) {
      toast.error('אין לך הרשאה לבצע פעולה זו - נדרשת הרשאת עריכה מלאה')
      return
    }

    // Validation
    if (!editCityForm.manager1_name.trim() || !editCityForm.manager1_phone.trim()) {
      toast.error('שם וטלפון מנהל ראשון הם שדות חובה')
      return
    }

    if (editCityForm.manager1_phone.length !== 10 || !/^05\d{8}$/.test(editCityForm.manager1_phone)) {
      toast.error('מספר טלפון מנהל ראשון חייב להיות בן 10 ספרות ולהתחיל ב-05')
      return
    }

    if (editCityForm.manager2_phone && (editCityForm.manager2_phone.length !== 10 || !/^05\d{8}$/.test(editCityForm.manager2_phone))) {
      toast.error('מספר טלפון מנהל שני חייב להיות בן 10 ספרות ולהתחיל ב-05')
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
        toast.error(data.error || 'שגיאה בעדכון הפרטים')
        setLoading(false)
        return
      }

      toast.success('הפרטים עודכנו בהצלחה!')
      setIsEditingLocation(false)
      setIsCityDetailsExpanded(false) // Collapse the form after successful save
      setHasCityFormChanges(false) // Reset form changes flag
      fetchCity()
      setLoading(false)
    } catch (error) {
      console.error('Error updating city details:', error)
      toast.error('אירעה שגיאה בעדכון הפרטים')
      setLoading(false)
    }
  }

  const handleCopyEquipmentFromCity = async () => {
    // Check permissions
    if (!canEdit) {
      toast.error('אין לך הרשאה לבצע פעולה זו - נדרשת הרשאת עריכה מלאה')
      return
    }

    if (!selectedCityToCopy) {
      toast.error('אנא בחר עיר להעתקת הציוד ממנה')
      return
    }

    showConfirmModal({
      title: 'העתקת ציוד',
      message: 'האם אתה בטוח שברצונך להעתיק את הציוד? הציוד הקיים ישאר כמו שהוא ויתווספו פריטים חדשים.',
      icon: '📋',
      confirmText: 'העתק',
      confirmColor: 'blue',
      onConfirm: async () => {
        setConfirmModal(prev => prev ? { ...prev, loading: true } : null)
        try {
          // Fetch equipment from selected city using new structure
          const response = await fetch(`/api/city-equipment?cityId=${selectedCityToCopy}`)
          const result = await response.json()

          if (!response.ok) throw new Error(result.error)

          const sourceEquipment = result.equipment || []

          if (sourceEquipment.length === 0) {
            toast.error('העיר שנבחרה אין בה ציוד להעתקה')
            closeConfirmModal()
            return
          }

          // Get existing global_equipment_ids in current city to avoid duplicates
          const existingGlobalIds = equipment.map(e => e.global_equipment_id)

          // Filter out equipment that already exists
          const newEquipmentItems = sourceEquipment.filter(
            (item: any) => !existingGlobalIds.includes(item.global_equipment_id)
          )

          if (newEquipmentItems.length === 0) {
            toast.error('כל הציוד מהעיר שנבחרה כבר קיים בעיר שלך')
            closeConfirmModal()
            return
          }

          // Add each equipment item to this city
          let successCount = 0
          for (const item of newEquipmentItems) {
            const addResponse = await fetch('/api/city-equipment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                city_id: cityId,
                global_equipment_id: item.global_equipment_id,
                quantity: item.quantity
              })
            })

            if (addResponse.ok) {
              successCount++
            }
          }

          toast.success(`${successCount} פריטי ציוד הועתקו בהצלחה!`)
          setShowCopyEquipment(false)
          setSelectedCityToCopy('')
          fetchEquipment()
        } catch (error) {
          console.error('Error copying equipment:', error)
          toast.error('אירעה שגיאה בהעתקת הציוד')
        } finally {
          closeConfirmModal()
        }
      }
    })
  }

  const handleTogglePushNotifications = async () => {
    try {
      setEnablingPush(true)

      if (pushEnabled) {
        // Disable push notifications
        await unsubscribeFromPush()
        setPushEnabled(false)
        toast.success('התראות כבויות')
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
            toast.error('התראות חסומות בדפדפן - יש לאפשר בהגדרות', { duration: 5000 })
          } else {
            toast.error('נדרשת הרשאה כדי להפעיל התראות', { duration: 5000 })
          }
          setEnablingPush(false)
          return
        }

        // Subscribe to push notifications
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidPublicKey) {
          toast.error('התראות לא זמינות - המנהל צריך להגדיר VAPID', { duration: 5000 })
          setEnablingPush(false)
          return
        }

        await subscribeToPush(cityId, vapidPublicKey)
        setPushEnabled(true)
        toast.success('התראות הופעלו בהצלחה!')
      }
    } catch (error) {
      console.error('Error toggling push notifications:', error)
      toast.error('שגיאה בהפעלת התראות. אנא נסה שוב.')
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

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">החשבון חסום</h2>
            <p className="text-gray-600 mb-6">
              החשבון שלך נחסם על ידי מנהל המערכת.
              <br />
              לפרטים נוספים, אנא פנה למנהל.
            </p>
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
                router.push('/login')
              }}
              className="w-full h-12 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              התנתק
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || isRedirecting) {
    // Show redirecting message - actual redirect happens in useEffect
    return (
      <div className="min-h-screen content-wrapper flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔐</div>
          <p className="text-gray-600">מעביר להתחברות...</p>
        </div>
      </div>
    )
  }

  // Volunteer View Mode - Full screen overlay with iframe
  if (volunteerViewMode) {
    return (
      <div className="fixed inset-0 z-[9999] bg-gray-100">
        {/* Floating Bottom Bar - matches the style from volunteer page */}
        <div className="fixed bottom-0 left-0 right-0 z-[10000] bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">👁️</span>
            <span className="text-sm font-medium">צפייה בממשק מתנדב</span>
          </div>
          <button
            onClick={() => setVolunteerViewMode(false)}
            className="bg-white text-purple-600 hover:bg-purple-50 font-bold px-4 py-2 rounded-xl transition-all hover:scale-105"
          >
            ⚙️ חזרה לניהול
          </button>
        </div>
        {/* Iframe with volunteer page */}
        <iframe
          src={`/city/${cityId}?hideAdminBar=true`}
          className="w-full h-full border-0 pb-14"
          title="תצוגת מתנדב"
        />
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
            <div className="hidden sm:flex gap-3 items-center">
              <Link href="/manager-guide">
                <Button
                  variant="outline"
                  className="border-2 border-purple-500 text-purple-600 hover:bg-purple-50 font-semibold px-6 py-2 rounded-xl transition-all duration-200 hover:scale-105"
                >
                  📖 מדריך
                </Button>
              </Link>
              {city?.request_mode === 'request' && city?.enable_push_notifications && (
                pushSupported ? (
                  <Button
                    onClick={handleTogglePushNotifications}
                    disabled={enablingPush}
                    variant="outline"
                    className={`border-2 font-semibold px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105 ${
                      pushEnabled
                        ? 'border-green-500 text-green-600 hover:bg-green-50'
                        : 'border-gray-400 text-gray-600 hover:bg-gray-50'
                    }`}
                    title={pushEnabled ? 'כבה התראות' : 'הפעל התראות'}
                  >
                    {enablingPush ? '⏳' : pushEnabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
                  </Button>
                ) : pushNotSupportedReason ? (
                  <Button
                    onClick={() => toast.error(pushNotSupportedReason, { duration: 5000 })}
                    variant="outline"
                    className="border-2 border-orange-400 text-orange-600 font-semibold px-4 py-2 rounded-xl"
                    title={pushNotSupportedReason}
                  >
                    <BellOff className="h-5 w-5" />
                  </Button>
                ) : null
              )}
              <Button
                onClick={() => setVolunteerViewMode(true)}
                variant="outline"
                className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105"
              >
                👁️ תצוגת מתנדב
              </Button>

              {/* Desktop Profile Button with Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-2xl shadow-md hover:shadow-lg transition-all hover:scale-105"
                >
                  👤
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Profile Dropdown - Shared for Mobile and Desktop */}
        {showProfileDropdown && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[9998] bg-black/30"
              onClick={() => setShowProfileDropdown(false)}
            />
            {/* Dropdown Menu - Mobile: full width near top, Desktop: centered modal */}
            <div className="fixed z-[9999] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200
              top-16 right-4 left-4
              sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[420px] sm:max-w-[90vw]">
              {/* Profile Header - Larger for desktop */}
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-5 sm:p-8 text-center">
                <div className="font-bold text-xl sm:text-2xl">{currentUser?.full_name || 'משתמש'}</div>
                <div className="text-sm sm:text-base opacity-90 mt-2">{currentUser?.email}</div>
                <div className="mt-3 inline-block bg-white/20 px-4 py-1.5 rounded-full text-sm">
                  🏙️ {city?.name} • {currentUser?.role === 'manager1' ? 'מנהל ראשי' : 'מנהל משני'}
                </div>
              </div>
              {/* Profile Actions - Larger buttons for desktop */}
              <div className="p-3 sm:p-4">
                <button
                  onClick={() => {
                    setShowProfileDropdown(false)
                    setAccountForm({
                      full_name: currentUser?.full_name || '',
                      phone: currentUser?.phone || '',
                      email: currentUser?.email || '',
                      current_password: '',
                      new_password: '',
                      confirm_password: ''
                    })
                    setAccountSettingsTab('details')
                    setShowAccountSettings(true)
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors text-right"
                >
                  <span className="text-2xl">✏️</span>
                  <span className="text-gray-700 text-base sm:text-lg font-medium">עריכת פרטים</span>
                </button>
                <button
                  onClick={() => {
                    setShowProfileDropdown(false)
                    setAccountForm({
                      full_name: currentUser?.full_name || '',
                      phone: currentUser?.phone || '',
                      email: currentUser?.email || '',
                      current_password: '',
                      new_password: '',
                      confirm_password: ''
                    })
                    setAccountSettingsTab('password')
                    setShowAccountSettings(true)
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors text-right"
                >
                  <span className="text-2xl">🔑</span>
                  <span className="text-gray-700 text-base sm:text-lg font-medium">שינוי סיסמה</span>
                </button>
                <div className="border-t border-gray-200 my-3" />
                <button
                  onClick={async () => {
                    setShowProfileDropdown(false)
                    await logout()
                    // Use hard navigation to ensure full page refresh and clear state
                    window.location.href = `/city/${cityId}`
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-red-50 transition-colors text-right text-red-600"
                >
                  <span className="text-2xl">🚪</span>
                  <span className="text-base sm:text-lg font-medium">התנתקות</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Mobile Top Action Bar */}
        <div className="sm:hidden flex justify-between items-center bg-white/90 backdrop-blur-sm rounded-xl p-3 mb-4 shadow-sm border border-gray-100 relative z-[50]">
          {/* Right side - Profile */}
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xl shadow-md hover:shadow-lg transition-all hover:scale-105"
          >
            👤
          </button>

          {/* Left side - Action buttons */}
          <div className="flex items-center gap-2">
            <Link href="/manager-guide">
              <button className="w-11 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-xl transition-all">
                📖
              </button>
            </Link>
            {city?.request_mode === 'request' && city?.enable_push_notifications && (
              pushSupported ? (
                <button
                  onClick={handleTogglePushNotifications}
                  disabled={enablingPush}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all relative ${
                    pushEnabled
                      ? 'bg-green-100 hover:bg-green-200 text-green-600'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-400'
                  }`}
                  title={pushEnabled ? 'התראות פעילות' : 'הפעל התראות'}
                >
                  {enablingPush ? '⏳' : pushEnabled ? '🔔' : '🔕'}
                  {pushEnabled && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </button>
              ) : pushNotSupportedReason ? (
                <button
                  onClick={() => toast.error(pushNotSupportedReason, { duration: 5000 })}
                  className="w-11 h-11 rounded-xl bg-orange-100 text-orange-500 flex items-center justify-center text-xl"
                  title={pushNotSupportedReason}
                >
                  🔕
                </button>
              ) : null
            )}
            <button
              onClick={() => setVolunteerViewMode(true)}
              className="w-11 h-11 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-600 flex items-center justify-center text-xl transition-all"
              title="תצוגת מתנדב"
            >
              👁️
            </button>
          </div>
        </div>


        {/* Desktop Tabs - Grid Layout */}
        <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
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
            className={`py-6 rounded-xl font-semibold text-lg transition-all duration-300 relative ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50 scale-105'
                : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
            }`}
          >
            <span className="text-2xl ml-2">📋</span> היסטוריית השאלות
            {borrowHistory.filter(item => item.status === 'pending_approval').length > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse shadow-lg">
                {borrowHistory.filter(item => item.status === 'pending_approval').length}
              </span>
            )}
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
            onClick={() => setActiveTab('reports')}
            className={`py-6 rounded-xl font-semibold text-lg transition-all duration-300 ${
              activeTab === 'reports'
                ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-500/50 scale-105'
                : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-teal-300 hover:bg-teal-50'
            }`}
          >
            <span className="text-2xl ml-2">📈</span> דוחות
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

        {/* Mobile Tabs - Pills with horizontal scroll */}
        <div className="sm:hidden flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <button
            onClick={() => setActiveTab('equipment')}
            className={`flex-shrink-0 px-4 py-2.5 rounded-full font-semibold text-sm transition-all flex items-center gap-1.5 ${
              activeTab === 'equipment'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            <span>📦</span> ציוד
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-shrink-0 px-4 py-2.5 rounded-full font-semibold text-sm transition-all flex items-center gap-1.5 relative ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            <span>📋</span> היסטוריה
            {borrowHistory.filter(item => item.status === 'pending_approval').length > 0 && (
              <span className={`mr-1 text-xs font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === 'history' ? 'bg-white text-indigo-600' : 'bg-blue-500 text-white'
              }`}>
                {borrowHistory.filter(item => item.status === 'pending_approval').length}
              </span>
            )}
          </button>
          {city?.request_mode === 'request' && (
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-shrink-0 px-4 py-2.5 rounded-full font-semibold text-sm transition-all flex items-center gap-1.5 relative ${
                activeTab === 'requests'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              <span>📝</span> בקשות
              {pendingRequestsCount > 0 && (
                <span className={`mr-1 text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === 'requests' ? 'bg-white text-purple-600' : 'bg-red-500 text-white'
                }`}>
                  {pendingRequestsCount}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-shrink-0 px-4 py-2.5 rounded-full font-semibold text-sm transition-all flex items-center gap-1.5 ${
              activeTab === 'reports'
                ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            <span>📈</span> דוחות
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-shrink-0 px-4 py-2.5 rounded-full font-semibold text-sm transition-all flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            <span>⚙️</span> הגדרות
          </button>
        </div>

        {activeTab === 'equipment' && (
          <div className="space-y-6">
            {/* Add from Global Pool - New prominent section */}
            <Card className="border-2 border-purple-200 shadow-xl rounded-2xl overflow-hidden bg-gradient-to-r from-purple-50 to-pink-50">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">📦 הוסף ציוד מהמאגר</h3>
                    <p className="text-sm text-gray-600">בחר ציוד מהמאגר הגלובלי והוסף לעיר שלך</p>
                    {!canEdit && (
                      <p className="text-xs text-red-600 mt-1">⚠️ נדרשת הרשאת עריכה מלאה</p>
                    )}
                  </div>
                  <Button
                    onClick={() => setShowEquipmentPoolModal(true)}
                    disabled={!canEdit}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold px-8 py-4 rounded-xl transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <span className="text-xl ml-2">📦</span> בחר מהמאגר
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Equipment Pool Modal */}
            {city && (
              <EquipmentPoolModal
                isOpen={showEquipmentPoolModal}
                onClose={() => setShowEquipmentPoolModal(false)}
                cityId={city.id}
                onEquipmentAdded={() => {
                  fetchEquipment()
                }}
              />
            )}

            <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-white/90 backdrop-blur-sm mb-6">
              <CardHeader
                className="bg-gradient-to-r from-gray-50 to-gray-100 pb-4 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setShowManualAddForm(!showManualAddForm)}
              >
                <CardTitle className="text-base font-medium text-gray-600 flex items-center justify-between">
                  <span>➕ הוספת ציוד ידנית (מתקדם)</span>
                  <span className="text-sm">{showManualAddForm ? '▲' : '▼'}</span>
                </CardTitle>
              </CardHeader>
              {showManualAddForm && (
              <CardContent className="p-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
                  <p className="text-sm text-blue-800">
                    💡 <strong>טיפ:</strong> התחל להקליד שם ציוד ותקבל הצעות מהמאגר הגלובלי. אם הציוד לא קיים, הוא יישלח לאישור מנהל ראשי.
                  </p>
                </div>
                <form onSubmit={handleAddEquipment} className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Input
                        value={newEquipment.name}
                        onChange={(e) => handleEquipmentNameChange(e.target.value)}
                        onFocus={() => {
                          if (globalPoolSuggestions.length > 0) setShowSuggestions(true)
                        }}
                        onBlur={() => {
                          // Delay hiding to allow click on suggestion
                          setTimeout(() => setShowSuggestions(false), 200)
                        }}
                        placeholder="🔍 הקלד שם ציוד..."
                        disabled={!canEdit}
                        className="w-full h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        autoComplete="off"
                      />
                      {/* Autocomplete dropdown */}
                      {showSuggestions && globalPoolSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-blue-300 rounded-xl shadow-lg overflow-hidden">
                          <div className="bg-blue-50 px-3 py-2 border-b border-blue-200">
                            <p className="text-xs text-blue-700 font-medium">📦 נמצא במאגר הגלובלי:</p>
                          </div>
                          {globalPoolSuggestions.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => selectSuggestion(item)}
                              className="w-full px-3 py-2 text-right hover:bg-blue-50 transition-colors flex items-center gap-2 border-b border-gray-100 last:border-0"
                            >
                              {item.image_url && (
                                <img src={item.image_url} alt="" className="w-8 h-8 object-cover rounded" />
                              )}
                              <div className="flex-1">
                                <span className="font-medium text-gray-800">{item.name}</span>
                                {item.category?.name && (
                                  <span className="text-xs text-gray-500 mr-2">({item.category.name})</span>
                                )}
                              </div>
                              <span className="text-green-600 text-xs">✓ קיים</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {/* Show "new item" indicator when no suggestions */}
                      {newEquipment.name.trim().length >= 2 && globalPoolSuggestions.length === 0 && !showSuggestions && (
                        <p className="text-xs text-amber-600 mt-1">
                          ⭐ פריט חדש - יישלח לאישור מנהל ראשי
                        </p>
                      )}
                    </div>
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

                    <div className="flex-1">
                      <Input
                        value={newEquipment.image_url}
                        onChange={(e) => setNewEquipment({ ...newEquipment, image_url: e.target.value })}
                        disabled={!canEdit}
                        placeholder="🖼️ כתובת URL של תמונה (אופציונלי)"
                        className="w-full h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500 mt-1 mr-2">
                        💡 העלה תמונה ל-Google Drive ← שתף ← העתק קישור ← <a href="/tools/google-drive-url-converter.html" target="_blank" className="text-blue-500 hover:underline">המר לקישור ישיר</a>
                      </p>
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
              )}
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
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-2xl font-bold text-gray-800">📋 רשימת ציוד</CardTitle>
                    <button
                      type="button"
                      onClick={() => window.open('/guides/equipment-guide.html', '_blank')}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 text-sm font-bold transition-colors"
                      title="מדריך ניהול ציוד"
                    >
                      ?
                    </button>
                  </div>
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
                            <label className="block text-xs font-medium text-gray-600 mb-1">🖼️ כתובת URL של תמונה <a href="/tools/google-drive-url-converter.html" target="_blank" className="text-blue-500 hover:underline">(ממיר)</a></label>
                            <Input
                              value={editingEquipment.image_url || ''}
                              onChange={(e) => setEditingEquipment({ ...editingEquipment, image_url: e.target.value })}
                              placeholder="הדבק כאן קישור לתמונה מ-Google Drive או כל מקור אחר (אופציונלי)"
                              className="w-full h-10 border-2 border-blue-300 rounded-lg text-sm"
                            />
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
                                <img src={(item as any).image_url} alt={item.name} className="w-8 h-8 object-cover rounded-lg" loading="lazy" />
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
                        <th className="text-center p-4 font-bold text-gray-700">🔢 כמות</th>
                        <th className="text-center p-4 font-bold text-gray-700">🔧 סטטוס</th>
                        <th className="text-center p-4 font-bold text-gray-700">🔄 מתכלה</th>
                        <th className="text-center p-4 font-bold text-gray-700">⚙️ פעולות</th>
                        <th className="text-center p-2">
                          <button
                            type="button"
                            onClick={() => window.open('/guides/equipment-guide.html', '_blank')}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 text-sm font-bold transition-colors"
                            title="מדריך ניהול ציוד"
                          >
                            ?
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipment.filter(item =>
                        item.name.toLowerCase().includes(equipmentSearchQuery.toLowerCase())
                      ).map(item => (
                        <React.Fragment key={item.id}>
                        <tr className="border-b hover:bg-blue-50 transition-colors">
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
                          <td></td>
                        </tr>
                        {editingEquipment?.id === item.id && (
                          <tr className="border-b bg-blue-50">
                            <td colSpan={7} className="p-4">
                              <div className="flex flex-col gap-2">
                                <label className="text-sm font-semibold text-gray-700">🖼️ כתובת URL של תמונה:</label>
                                <Input
                                  value={editingEquipment.image_url || ''}
                                  onChange={(e) => setEditingEquipment({ ...editingEquipment, image_url: e.target.value })}
                                  placeholder="הדבק כאן קישור לתמונה מ-Google Drive או כל מקור אחר (אופציונלי)"
                                  className="w-full h-12 border-2 border-blue-400 rounded-lg text-sm bg-white"
                                />
                                <p className="text-xs text-gray-600">
                                  💡 העלה תמונה ל-Google Drive ← שתף ← העתק קישור ← <a href="/tools/google-drive-url-converter.html" target="_blank" className="text-blue-500 hover:underline">המר לקישור ישיר</a>
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
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
                                <Button
                                  onClick={() => openReturnImage(item.return_image_url!)}
                                  disabled={checkingImage}
                                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
                                >
                                  {checkingImage ? '⏳' : '📷'} צפה בתמונה
                                </Button>
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
                                <div key={item.id} className={`p-3 rounded-lg border-2 ${
                                  item.status === 'borrowed'
                                    ? 'bg-orange-50 border-orange-200'
                                    : item.status === 'pending_approval'
                                    ? 'bg-yellow-50 border-yellow-200'
                                    : 'bg-green-50 border-green-200'
                                }`}>
                                  {/* Equipment name and action buttons on same row */}
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-semibold text-gray-800 flex-1">{item.equipment_name}</p>
                                    <div className="flex gap-1.5 items-center">
                                      {/* View image button */}
                                      {(item.status === 'returned' || item.status === 'pending_approval') && item.return_image_url && (
                                        <Button
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            openReturnImage(item.return_image_url!)
                                          }}
                                          disabled={checkingImage}
                                          className="h-8 w-8 p-0 bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
                                          title="צפה בתמונת החזרה"
                                        >
                                          {checkingImage ? '⏳' : '📷'}
                                        </Button>
                                      )}
                                      {/* Status toggle button */}
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
                                          className={`h-8 px-2 text-xs font-semibold rounded-lg transition-all ${
                                            item.status === 'borrowed'
                                              ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                              : 'bg-green-500 hover:bg-green-600 text-white'
                                          }`}
                                          title={item.status === 'borrowed' ? 'סמן כהוחזר' : 'סמן כהושאל'}
                                        >
                                          {item.status === 'borrowed' ? '⏳' : '✅'}
                                        </Button>
                                      )}
                                      {item.status === 'pending_approval' && (
                                        <span className="inline-flex items-center px-2 py-1 bg-yellow-500 text-white text-xs font-semibold rounded-lg">
                                          ⏳
                                        </span>
                                      )}
                                      {/* Hide button */}
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDeleteHistory(item.id)
                                        }}
                                        disabled={loading || !canEdit}
                                        className="h-8 w-8 p-0 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="הסתר מההיסטוריה"
                                      >
                                        👁️‍🗨️
                                      </Button>
                                    </div>
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
                      <th className="text-right p-4 font-bold text-gray-700" colSpan={3}>🎯 ציוד ופעולות</th>
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
                          <td className="p-4" colSpan={3}>
                            {isExpanded ? (
                              <div className="space-y-2">
                                {group.items.map(item => (
                                  <div key={item.id} className={`flex items-center justify-between gap-3 p-2 rounded-lg border ${
                                    item.status === 'borrowed'
                                      ? 'bg-orange-50 border-orange-200'
                                      : item.status === 'pending_approval'
                                      ? 'bg-yellow-50 border-yellow-200'
                                      : 'bg-green-50 border-green-200'
                                  }`}>
                                    <span className="font-medium text-gray-800">{item.equipment_name}</span>
                                    <div className="flex gap-2 items-center">
                                      {/* View image button */}
                                      {(item.status === 'returned' || item.status === 'pending_approval') && item.return_image_url && (
                                        <Button
                                          size="sm"
                                          onClick={() => openReturnImage(item.return_image_url!)}
                                          disabled={checkingImage}
                                          className="h-8 w-8 p-0 bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
                                          title="צפה בתמונת החזרה"
                                        >
                                          {checkingImage ? '⏳' : '📷'}
                                        </Button>
                                      )}
                                      {/* Status toggle button */}
                                      {item.status !== 'pending_approval' && (
                                        <Button
                                          size="sm"
                                          onClick={() => handleUpdateHistoryStatus(item.id, item.status === 'borrowed' ? 'returned' : 'borrowed')}
                                          disabled={loading}
                                          className={`h-8 px-3 text-xs font-semibold rounded transition-all ${
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
                                        <span className="inline-block px-3 py-1.5 bg-yellow-500 text-white text-xs font-semibold rounded">
                                          ⏳ ממתין
                                        </span>
                                      )}
                                      {/* Hide button */}
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteHistory(item.id)}
                                        disabled={loading || !canEdit}
                                        className="h-8 w-8 p-0 hover:bg-gray-200 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title={`הסתר: ${item.equipment_name}`}
                                      >
                                        👁️‍🗨️
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500 text-sm">{group.items.length} פריטים</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  group.allReturned
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-orange-100 text-orange-700'
                                }`}>
                                  {group.allReturned ? '✅' : '⏳'}
                                </span>
                              </div>
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

        {activeTab === 'reports' && city && (
          <ReportsTab
            cityId={cityId}
            cityName={city.name}
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
                {/* Temporary Closure Toggle */}
                <div className={`flex items-center justify-between p-4 rounded-xl border-2 ${
                  city?.is_temporarily_closed
                    ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-300'
                    : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{city?.is_temporarily_closed ? '🚫' : '✅'}</span>
                    <div>
                      <div className="font-semibold text-gray-800">
                        {city?.is_temporarily_closed ? 'הארון סגור זמנית' : 'הארון פעיל'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {city?.is_temporarily_closed
                          ? 'מתנדבים לא יכולים להשאיל ציוד כרגע'
                          : 'הארון פתוח להשאלות'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!canEdit) {
                        toast.error('אין לך הרשאה לבצע פעולה זו')
                        return
                      }
                      setShowClosureConfirm(true)
                    }}
                    disabled={!canEdit}
                    className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${
                      city?.is_temporarily_closed ? 'bg-red-500' : 'bg-green-500'
                    } disabled:opacity-50`}
                  >
                    <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
                      city?.is_temporarily_closed ? 'right-0.5' : 'left-0.5'
                    }`} />
                  </button>
                </div>

                {/* Closure Message (shown when closed) */}
                {city?.is_temporarily_closed && (
                  <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      הודעה למתנדבים (אופציונלי)
                    </label>
                    <Input
                      type="text"
                      value={city?.closure_message || ''}
                      disabled={!canEdit}
                      onChange={(e) => {
                        if (city) setCity({ ...city, closure_message: e.target.value })
                      }}
                      onBlur={async (e) => {
                        if (!canEdit) return
                        try {
                          const { data: { session } } = await supabase.auth.getSession()
                          const accessToken = session?.access_token
                          await fetch('/api/city/update-details', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
                            },
                            credentials: 'include',
                            body: JSON.stringify({ cityId, closure_message: e.target.value || null })
                          })
                        } catch (error) {
                          console.error('Error updating closure message:', error)
                        }
                      }}
                      placeholder="לדוגמה: הארון בשיפוץ, יחזור לפעילות בקרוב"
                      className="h-11 border-2 border-red-200 rounded-xl"
                    />
                  </div>
                )}

                {/* Request Mode Settings - Compact Toggle */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{city?.request_mode === 'direct' ? '⚡' : '📝'}</span>
                    <div>
                      <div className="font-semibold text-gray-800">מצב פעולה</div>
                      <div className="text-xs text-gray-500">
                        {city?.request_mode === 'direct' ? 'השאלה ישירה - ללא אישור' : 'מצב בקשות - דרוש אישור'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!canEdit) {
                        toast.error('אין לך הרשאה לבצע פעולה זו - נדרשת הרשאת עריכה מלאה')
                        return
                      }
                      const newMode = city?.request_mode === 'direct' ? 'request' : 'direct'
                      const modeText = newMode === 'direct' ? 'השאלה ישירה' : 'מצב בקשות'
                      const isEnablingRequests = newMode === 'request'

                      showConfirmModal({
                        title: 'שינוי מצב השאלה',
                        message: `האם להחליף ל${modeText}?`,
                        icon: isEnablingRequests ? '📝' : '✅',
                        confirmText: 'החלף',
                        confirmColor: isEnablingRequests ? 'blue' : 'green',
                        onConfirm: async () => {
                          setConfirmModal(prev => prev ? { ...prev, loading: true } : null)
                          try {
                            const { data: { session } } = await supabase.auth.getSession()
                            const accessToken = session?.access_token
                            const response = await fetch('/api/city/update-details', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
                              },
                              credentials: 'include',
                              body: JSON.stringify({ cityId, request_mode: newMode })
                            })
                            if (!response.ok) throw new Error('שגיאה בעדכון')
                            await fetchCity()
                          } catch (error: any) {
                            toast.error('שגיאה בעדכון: ' + error.message)
                          } finally {
                            closeConfirmModal()
                          }
                        }
                      })
                    }}
                    disabled={!canEdit}
                    className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${
                      city?.request_mode === 'request' ? 'bg-purple-500' : 'bg-green-500'
                    } disabled:opacity-50`}
                  >
                    <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
                      city?.request_mode === 'request' ? 'right-0.5' : 'left-0.5'
                    }`} />
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
                              toast.error('אין לך הרשאה לערוך קוד ארון - נדרשת הרשאת עריכה מלאה')
                              return
                            }
                            // Update local state immediately
                            setCity({ ...city, cabinet_code: e.target.value })
                          }}
                          onBlur={async (e) => {
                            if (!canEdit) return
                            // Save to server when user finishes editing
                            try {
                              const { data: { session } } = await supabase.auth.getSession()
                              const accessToken = session?.access_token
                              const response = await fetch('/api/city/update-details', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
                                },
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
                                toast.error('שגיאה בעדכון קוד ארון')
                                fetchCity() // Revert to server value
                              }
                            } catch (error) {
                              console.error('Error updating cabinet code:', error)
                              toast.error('שגיאה בעדכון קוד ארון')
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
                              toast.error('אין לך הרשאה לבצע פעולה זו - נדרשת הרשאת עריכה מלאה')
                              return
                            }

                            const newValue = !city.require_call_id

                            // Update local state immediately for instant feedback
                            setCity({ ...city, require_call_id: newValue })

                            try {
                              const { data: { session } } = await supabase.auth.getSession()
                              const accessToken = session?.access_token
                              const response = await fetch('/api/city/update-details', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
                                },
                                credentials: 'include',
                                body: JSON.stringify({
                                  cityId,
                                  require_call_id: newValue
                                })
                              })

                              if (response.ok) {
                                toast.success(newValue ? 'מזהה קריאה חובה' : 'מזהה קריאה אופציונלי')
                                fetchCity() // Refresh to ensure sync
                              } else {
                                // Revert on error
                                toast.error('שגיאה בעדכון')
                                fetchCity()
                              }
                            } catch (error) {
                              console.error('Error updating require_call_id:', error)
                              toast.error('שגיאה בעדכון')
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

                      {/* Max Request Distance */}
                      <div className="space-y-2">
                        <label className={`block text-sm font-semibold ${!canEdit ? 'text-gray-400' : 'text-gray-700'}`}>📍 הגבלת טווח לבקשות (ק"מ)</label>
                        <p className="text-xs text-gray-500 mb-2">הגדר טווח מקסימלי שבו המשתמש צריך להימצא מהארון כדי לשלוח בקשה. הגדר 0 לביטול הגבלה.</p>
                        <div className="flex items-center gap-3">
                          {/* Stepper Control */}
                          <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                            <button
                              type="button"
                              disabled={!canEdit || (city.max_request_distance_km ?? 5) <= 0}
                              onClick={() => {
                                if (!canEdit) return
                                const currentValue = city.max_request_distance_km ?? 5
                                const newValue = Math.max(0, currentValue - 1)
                                setCity({ ...city, max_request_distance_km: newValue })
                                setDistanceSaveStatus('idle')

                                // Clear existing timer
                                if (distanceSaveTimer) clearTimeout(distanceSaveTimer)

                                // Set new debounced save after 2 seconds
                                const timer = setTimeout(async () => {
                                  setDistanceSaveStatus('saving')
                                  try {
                                    const { data: { session } } = await supabase.auth.getSession()
                                    const accessToken = session?.access_token
                                    const response = await fetch('/api/city/update-details', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
                                      },
                                      credentials: 'include',
                                      body: JSON.stringify({ cityId, max_request_distance_km: newValue })
                                    })
                                    if (response.ok) {
                                      setDistanceSaveStatus('saved')
                                      setTimeout(() => setDistanceSaveStatus('idle'), 2000)
                                    } else {
                                      setDistanceSaveStatus('error')
                                      fetchCity()
                                    }
                                  } catch {
                                    setDistanceSaveStatus('error')
                                    fetchCity()
                                  }
                                }, 2000)
                                setDistanceSaveTimer(timer)
                              }}
                              className="w-12 h-12 flex items-center justify-center text-2xl font-bold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              −
                            </button>
                            <div className="w-16 h-12 flex items-center justify-center border-x-2 border-gray-200 font-bold text-lg text-gray-800">
                              {city.max_request_distance_km ?? 5}
                            </div>
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => {
                                if (!canEdit) return
                                const currentValue = city.max_request_distance_km ?? 5
                                const newValue = currentValue + 1
                                setCity({ ...city, max_request_distance_km: newValue })
                                setDistanceSaveStatus('idle')

                                // Clear existing timer
                                if (distanceSaveTimer) clearTimeout(distanceSaveTimer)

                                // Set new debounced save after 2 seconds
                                const timer = setTimeout(async () => {
                                  setDistanceSaveStatus('saving')
                                  try {
                                    const { data: { session } } = await supabase.auth.getSession()
                                    const accessToken = session?.access_token
                                    const response = await fetch('/api/city/update-details', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
                                      },
                                      credentials: 'include',
                                      body: JSON.stringify({ cityId, max_request_distance_km: newValue })
                                    })
                                    if (response.ok) {
                                      setDistanceSaveStatus('saved')
                                      setTimeout(() => setDistanceSaveStatus('idle'), 2000)
                                    } else {
                                      setDistanceSaveStatus('error')
                                      fetchCity()
                                    }
                                  } catch {
                                    setDistanceSaveStatus('error')
                                    fetchCity()
                                  }
                                }, 2000)
                                setDistanceSaveTimer(timer)
                              }}
                              className="w-12 h-12 flex items-center justify-center text-2xl font-bold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-gray-600">ק"מ</span>
                          <span className={`text-sm px-3 py-1 rounded-full ${
                            (city.max_request_distance_km ?? 5) > 0
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {(city.max_request_distance_km ?? 5) > 0
                              ? `מוגבל ל-${city.max_request_distance_km ?? 5} ק"מ`
                              : 'ללא הגבלה'}
                          </span>
                          {/* Save Status Indicator */}
                          {distanceSaveStatus !== 'idle' && (
                            <span className={`text-sm px-3 py-1 rounded-full font-semibold ${
                              distanceSaveStatus === 'saving' ? 'bg-yellow-100 text-yellow-700' :
                              distanceSaveStatus === 'saved' ? 'bg-green-100 text-green-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {distanceSaveStatus === 'saving' ? '⏳ שומר...' :
                               distanceSaveStatus === 'saved' ? '✓ נשמר' :
                               '✗ שגיאה'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-amber-600 mt-1">
                          💡 לצורך מניעת ספאם, המערכת תבקש מהמשתמש לאשר גישה למיקום לפני שליחת בקשה
                        </p>
                      </div>
                    </div>
                  )}

                {/* Navigation & Push Notifications - Side by Side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Hide Navigation Toggle */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border-2 border-amber-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-800 text-sm">🗺️ הסתר ניווט</div>
                        <div className="text-xs text-gray-500 truncate">הסתר Google Maps / Waze</div>
                      </div>
                      <button
                        onClick={async () => {
                          if (!canEdit) {
                            toast.error('אין לך הרשאה לבצע פעולה זו')
                            return
                          }
                          const newValue = !city?.hide_navigation
                          setCity({ ...city!, hide_navigation: newValue })
                          try {
                            const { data: { session } } = await supabase.auth.getSession()
                            const accessToken = session?.access_token
                            const response = await fetch('/api/city/update-details', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
                              },
                              credentials: 'include',
                              body: JSON.stringify({ cityId, hide_navigation: newValue })
                            })
                            if (!response.ok) fetchCity()
                          } catch { fetchCity() }
                        }}
                        className={`flex-shrink-0 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
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
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-800 text-sm">🔔 התראות דחיפה</div>
                        <div className="text-xs text-gray-500 truncate">התראות על בקשות חדשות</div>
                      </div>
                      <button
                        onClick={async () => {
                          const newValue = !city?.enable_push_notifications
                          setCity({ ...city!, enable_push_notifications: newValue })
                          try {
                            const { data: { session } } = await supabase.auth.getSession()
                            const accessToken = session?.access_token
                            const response = await fetch('/api/city/update-details', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
                              },
                              credentials: 'include',
                              body: JSON.stringify({ cityId, enable_push_notifications: newValue })
                            })
                            if (!response.ok) fetchCity()
                          } catch { fetchCity() }
                        }}
                        className={`flex-shrink-0 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                          city?.enable_push_notifications
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-300 text-gray-600'
                        }`}
                      >
                        {city?.enable_push_notifications ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                </div>

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
                              onChange={(e) => { setEditCityForm({ ...editCityForm, manager1_name: e.target.value }); setHasCityFormChanges(true) }}
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
                              onChange={(e) => { setEditCityForm({ ...editCityForm, manager1_phone: e.target.value }); setHasCityFormChanges(true) }}
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
                              onChange={(e) => { setEditCityForm({ ...editCityForm, manager2_name: e.target.value }); setHasCityFormChanges(true) }}
                              placeholder="שם מלא"
                              className="h-12 border-2 border-gray-200 rounded-xl focus:border-indigo-500 transition-colors"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">📞 טלפון מנהל שני (אופציונלי)</label>
                            <Input
                              type="tel"
                              value={editCityForm.manager2_phone}
                              onChange={(e) => { setEditCityForm({ ...editCityForm, manager2_phone: e.target.value }); setHasCityFormChanges(true) }}
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
                                    setHasCityFormChanges(true)
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
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                              🔐 כתובת ארון בטוקן
                              <button
                                type="button"
                                onClick={() => window.open('/guides/add-location-guide.html', '_blank')}
                                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-600 text-xs font-bold transition-colors"
                                title="מדריך הוספת מיקום"
                              >
                                ?
                              </button>
                            </label>
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
                                    setHasCityFormChanges(true)
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
                                      onClick={() => { setEditCityForm({ ...editCityForm, location_image: null }); setHasCityFormChanges(true) }}
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

                                    setEditCityForm({ ...editCityForm, location_image: compressedBase64 }); setHasCityFormChanges(true)
                                    setLoading(false)
                                  } catch (error: any) {
                                    setLoading(false)
                                    toast.error(error.message || 'שגיאה בהעלאת התמונה')
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
                                  setEditCityForm({ ...editCityForm, location_description: e.target.value }); setHasCityFormChanges(true)
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
                        disabled={loading || !hasCityFormChanges}
                        className={`w-full h-12 font-bold rounded-xl shadow-md transition-all ${
                          hasCityFormChanges
                            ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white hover:shadow-lg'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
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

        {/* Closure Confirmation Modal */}
        {showClosureConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
              {/* Header */}
              <div className={`p-6 text-center ${
                city?.is_temporarily_closed
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                  : 'bg-gradient-to-r from-orange-500 to-red-500'
              }`}>
                <div className="text-5xl mb-3">
                  {city?.is_temporarily_closed ? '✅' : '🚧'}
                </div>
                <h2 className="text-2xl font-bold text-white">
                  {city?.is_temporarily_closed ? 'פתיחת הארון' : 'סגירת הארון זמנית'}
                </h2>
              </div>

              {/* Content */}
              <div className="p-6 text-center">
                <p className="text-gray-700 text-lg mb-6">
                  {city?.is_temporarily_closed
                    ? 'האם לפתוח את הארון ולאפשר למתנדבים להשאיל ציוד?'
                    : 'האם לסגור את הארון זמנית? מתנדבים לא יוכלו להשאיל ציוד עד שתפתח אותו מחדש.'}
                </p>

                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => setShowClosureConfirm(false)}
                    variant="outline"
                    className="px-6 py-2 border-2 border-gray-300 hover:bg-gray-50"
                  >
                    ביטול
                  </Button>
                  <Button
                    onClick={async () => {
                      const newValue = !city?.is_temporarily_closed
                      try {
                        // Get access token for authorization
                        const { data: { session } } = await supabase.auth.getSession()
                        const accessToken = session?.access_token

                        const response = await fetch('/api/city/update-details', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
                          },
                          credentials: 'include',
                          body: JSON.stringify({
                            cityId,
                            is_temporarily_closed: newValue,
                            closure_message: newValue ? (city?.closure_message || 'הארון סגור זמנית לתחזוקה') : null
                          })
                        })
                        if (!response.ok) {
                          const data = await response.json()
                          throw new Error(data.error || 'שגיאה בעדכון')
                        }
                        toast.success(newValue ? 'הארון נסגר זמנית' : 'הארון נפתח')
                        setShowClosureConfirm(false)
                        await fetchCity()
                      } catch (error: any) {
                        toast.error('שגיאה בעדכון: ' + error.message)
                      }
                    }}
                    className={`px-6 py-2 text-white font-semibold ${
                      city?.is_temporarily_closed
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                        : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
                    }`}
                  >
                    {city?.is_temporarily_closed ? '✅ פתח את הארון' : '🚧 סגור זמנית'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account Settings Modal */}
        {showAccountSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              {/* Header with Tabs */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 border-b">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold text-gray-800">⚙️ הגדרות חשבון</h2>
                  <button
                    onClick={() => setShowAccountSettings(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ✕
                  </button>
                </div>
                {/* Tab Buttons */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAccountSettingsTab('details')}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                      accountSettingsTab === 'details'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    ✏️ פרטים
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountSettingsTab('password')}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                      accountSettingsTab === 'password'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    🔑 סיסמה
                  </button>
                </div>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault()

                  // Validate based on active tab
                  if (accountSettingsTab === 'password') {
                    if (!accountForm.current_password) {
                      toast.error('יש להזין את הסיסמה הנוכחית')
                      return
                    }
                    if (!accountForm.new_password) {
                      toast.error('יש להזין סיסמה חדשה')
                      return
                    }
                    if (accountForm.new_password !== accountForm.confirm_password) {
                      toast.error('הסיסמה החדשה ואישור הסיסמה אינם תואמים')
                      return
                    }
                    if (accountForm.new_password.length < 6) {
                      toast.error('הסיסמה החדשה חייבת להיות באורך 6 תווים לפחות')
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
                        full_name: accountSettingsTab === 'details' ? accountForm.full_name : undefined,
                        phone: accountSettingsTab === 'details' ? accountForm.phone : undefined,
                        current_password: accountSettingsTab === 'password' ? accountForm.current_password : undefined,
                        new_password: accountSettingsTab === 'password' ? accountForm.new_password : undefined
                      })
                    })

                    const data = await response.json()

                    if (data.success) {
                      // If password was changed, update cookies with new tokens
                      if (data.passwordChanged && data.newAccessToken) {
                        // Use 30 days - same as "remember me" since user is already logged in
                        const maxAge = 60 * 60 * 24 * 30 // 30 days
                        const expiryDate = new Date(Date.now() + maxAge * 1000).toUTCString()
                        document.cookie = `sb-access-token=${data.newAccessToken}; path=/; max-age=${maxAge}; expires=${expiryDate}; SameSite=Lax`
                        if (data.newRefreshToken) {
                          document.cookie = `sb-refresh-token=${data.newRefreshToken}; path=/; max-age=${maxAge}; expires=${expiryDate}; SameSite=Lax`
                        }
                        // Wait for cookies to be stored
                        await new Promise(resolve => setTimeout(resolve, 300))
                      }

                      // If re-login is required (edge case where re-auth failed)
                      if (data.requireReLogin) {
                        toast.success('הסיסמה שונתה בהצלחה! יש להתחבר מחדש.')
                        await logout()
                        router.push('/login')
                        return
                      }

                      toast.success(accountSettingsTab === 'details' ? 'הפרטים עודכנו בהצלחה!' : 'הסיסמה שונתה בהצלחה!')
                      setShowAccountSettings(false)

                      // Refresh current user data
                      const authResult = await checkAuth()
                      setCurrentUser(authResult.user)
                    } else {
                      toast.error(data.error || 'שגיאה בעדכון')
                    }
                  } catch (error) {
                    console.error('Error updating account:', error)
                    toast.error('שגיאה בעדכון')
                  } finally {
                    setLoading(false)
                  }
                }}
                className="p-5 space-y-4"
              >
                {/* Details Tab */}
                {accountSettingsTab === 'details' && (
                  <div className="space-y-4">
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
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        לא ניתן לשנות את כתובת המייל
                      </p>
                    </div>
                  </div>
                )}

                {/* Password Tab */}
                {accountSettingsTab === 'password' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        סיסמה נוכחית <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="password"
                        value={accountForm.current_password}
                        onChange={(e) => setAccountForm({ ...accountForm, current_password: e.target.value })}
                        className="h-12 text-base border-2"
                        autoComplete="current-password"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        סיסמה חדשה <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="password"
                        value={accountForm.new_password}
                        onChange={(e) => setAccountForm({ ...accountForm, new_password: e.target.value })}
                        className="h-12 text-base border-2"
                        autoComplete="new-password"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        אישור סיסמה חדשה <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="password"
                        value={accountForm.confirm_password}
                        onChange={(e) => setAccountForm({ ...accountForm, confirm_password: e.target.value })}
                        className="h-12 text-base border-2"
                        autoComplete="new-password"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl"
                >
                  {loading ? '⏳ שומר...' : (accountSettingsTab === 'details' ? '💾 שמור פרטים' : '🔑 שנה סיסמה')}
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal && confirmModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeConfirmModal}>
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`p-6 rounded-t-2xl ${
              confirmModal.confirmColor === 'red' ? 'bg-gradient-to-r from-red-500 to-rose-500' :
              confirmModal.confirmColor === 'orange' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
              confirmModal.confirmColor === 'green' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
              'bg-gradient-to-r from-blue-500 to-cyan-500'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-4xl">{confirmModal.icon}</span>
                <h3 className="text-xl font-bold text-white">{confirmModal.title}</h3>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-gray-700 text-lg leading-relaxed">{confirmModal.message}</p>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 pt-0">
              <Button
                onClick={closeConfirmModal}
                disabled={confirmModal.loading}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all"
              >
                ביטול
              </Button>
              <Button
                onClick={confirmModal.onConfirm}
                disabled={confirmModal.loading}
                className={`flex-1 text-white font-semibold py-3 rounded-xl transition-all ${
                  confirmModal.confirmColor === 'red' ? 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600' :
                  confirmModal.confirmColor === 'orange' ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600' :
                  confirmModal.confirmColor === 'green' ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600' :
                  'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'
                }`}
              >
                {confirmModal.loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span>
                    מעבד...
                  </span>
                ) : confirmModal.confirmText}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Image Not Available Modal */}
      {showImageNotAvailable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowImageNotAvailable(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 rounded-t-2xl bg-gradient-to-r from-gray-400 to-gray-500">
              <div className="flex items-center justify-center">
                <span className="text-6xl">🖼️</span>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-2">התמונה לא זמינה</h3>
              <p className="text-gray-600">
                תמונות החזרה נשמרות למשך 5 ימים בלבד.
                <br />
                תמונה זו כבר נמחקה מהמערכת.
              </p>
            </div>

            {/* Footer */}
            <div className="p-6 pt-0">
              <Button
                onClick={() => setShowImageNotAvailable(false)}
                className="w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-3 rounded-xl transition-all"
              >
                הבנתי
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Footer with Feedback Link */}
      <div className="mt-12 mb-8">
        <div className="text-center py-4 border-t border-gray-200">
          <p className="text-gray-400 text-xs">
            מערכת ארון ציוד ידידים •{' '}
            <Link href={`/feedback?source=city_admin&city=${encodeURIComponent(city?.name || '')}`} className="text-indigo-500 hover:text-indigo-600 hover:underline">
              דווח על בעיה או הצע שיפור
            </Link>
          </p>
          <p className="text-gray-300 text-[10px] mt-1">
            גירסה {VERSION}
          </p>
        </div>
      </div>
    </div>
  )
}
