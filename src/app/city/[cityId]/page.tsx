'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { Equipment, EquipmentWithCategory, BorrowHistory, BorrowForm, ReturnForm, City, CreateRequestForm } from '@/types'
import Logo from '@/components/Logo'
import CameraCapture from '@/components/CameraCapture'
import { Phone, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CityPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const cityId = params.cityId as string

  // Check if we should open return tab from URL
  const initialTab = searchParams.get('tab') === 'return' ? 'return' : 'borrow'
  // Hide admin bar when viewing inside iframe from admin page
  const hideAdminBar = searchParams.get('hideAdminBar') === 'true'

  const [city, setCity] = useState<City | null>(null)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [borrowHistory, setBorrowHistory] = useState<BorrowHistory[]>([])
  const [activeTab, setActiveTab] = useState<'borrow' | 'return'>(initialTab)
  const [borrowForm, setBorrowForm] = useState<BorrowForm>({ name: '', phone: '', equipment_id: '' })
  const [returnForm, setReturnForm] = useState<ReturnForm>({ phone: '' })
  const [userBorrows, setUserBorrows] = useState<BorrowHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [equipmentSearch, setEquipmentSearch] = useState('')
  const [showEquipmentDropdown, setShowEquipmentDropdown] = useState(false)

  // Request mode state
  const [requestForm, setRequestForm] = useState<CreateRequestForm>({
    requester_name: '',
    requester_phone: '',
    call_id: '',
    items: []
  })
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({})
  const [createdToken, setCreatedToken] = useState<string>('')
  const [requestCreated, setRequestCreated] = useState(false)
  const [isTableExpanded, setIsTableExpanded] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Return status selection
  const [returnStatus, setReturnStatus] = useState<{ borrowId: string; equipmentId: string } | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<'working' | 'faulty'>('working')
  const [faultyNotes, setFaultyNotes] = useState('')
  const [showCamera, setShowCamera] = useState(false)
  const [returnImage, setReturnImage] = useState<File | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Distance error modal
  const [distanceError, setDistanceError] = useState<{ distance: number; maxDistance: number } | null>(null)

  // Admin status for showing "return to admin" bar
  const [adminUrl, setAdminUrl] = useState<string | null>(null)

  useEffect(() => {
    if (cityId) {
      fetchCity()
      fetchEquipment()
      checkAdminStatus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityId])

  const checkAdminStatus = async () => {
    try {
      // Use API endpoint for more reliable auth check (uses cookies)
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      })

      if (!response.ok) {
        setAdminUrl(null)
        return
      }

      const data = await response.json()

      if (data.success && data.user) {
        if (data.user.role === 'super_admin') {
          setAdminUrl('/super-admin')
        } else if (data.user.role === 'city_manager' && data.user.city_id) {
          setAdminUrl(`/city/${data.user.city_id}/admin`)
        } else {
          setAdminUrl(null)
        }
      } else {
        setAdminUrl(null)
      }
    } catch (error) {
      console.error('Error checking admin status:', error)
      setAdminUrl(null)
    }
  }

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
      .from('city_equipment')
      .select(`
        *,
        global_equipment:global_equipment_pool!inner(
          *,
          category:equipment_categories(*)
        )
      `)
      .eq('city_id', cityId)
      .order('display_order')

    if (error) {
      console.error('Error fetching equipment:', error)
    } else {
      // Flatten the structure for compatibility with existing code
      const flattenedData = (data || []).map((item: any) => ({
        // Use global equipment ID as primary ID (for selection and history)
        id: item.global_equipment.id,
        // Keep city equipment ID for quantity updates
        city_equipment_id: item.id,
        // Override with city-specific data
        quantity: item.quantity,
        display_order: item.display_order,
        equipment_status: item.equipment_status || 'working',
        // Spread all global equipment data
        ...item.global_equipment,
        // Preserve category
        category: item.global_equipment.category
      }))
      setEquipment(flattenedData)
    }
  }

  // === DIRECT MODE FUNCTIONS ===

  const handleBorrow = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!borrowForm.name || !borrowForm.phone) {
      toast.error('אנא מלא את כל השדות')
      return
    }

    // Validate name (at least 2 words)
    const nameParts = borrowForm.name.trim().split(/\s+/)
    if (nameParts.length < 2) {
      toast.error('יש להזין שם ושם משפחה (לפחות 2 מילים)')
      return
    }

    // Validate phone (exactly 10 digits, starts with 05)
    const phoneDigits = borrowForm.phone.replace(/\D/g, '')
    if (phoneDigits.length !== 10 || !phoneDigits.startsWith('05')) {
      toast.error('מספר טלפון חייב להיות 10 ספרות ולהתחיל ב-05')
      return
    }

    // Validate selected items
    if (selectedItems.size === 0) {
      toast.error('יש לבחור לפחות פריט אחד')
      return
    }

    setLoading(true)

    try {
      // Process each selected item
      for (const itemId of Array.from(selectedItems)) {
        const selectedEquipment = equipment.find(eq => eq.id === itemId)

        if (!selectedEquipment || selectedEquipment.quantity <= 0) {
          console.error(`Equipment ${itemId} not available`)
          continue
        }

        if (selectedEquipment.equipment_status === 'faulty') {
          console.error(`Equipment ${itemId} is faulty`)
          continue
        }

        const quantityToTake = selectedEquipment.is_consumable ? (itemQuantities[itemId] || 1) : 1
        const isConsumable = selectedEquipment.is_consumable
        const borrowStatus = isConsumable ? 'returned' : 'borrowed'
        const returnDate = isConsumable ? new Date().toISOString() : null

        // Create borrow history record
        const { error: borrowError } = await supabase
          .from('borrow_history')
          .insert({
            name: borrowForm.name,
            phone: borrowForm.phone,
            equipment_id: itemId,
            equipment_name: selectedEquipment.name,
            city_id: cityId,
            status: borrowStatus,
            return_date: returnDate,
            quantity: quantityToTake
          })

        if (borrowError) {
          console.error('Error creating borrow record:', borrowError)
          continue
        }

        // Update equipment quantity in city_equipment table
        const { error: updateError } = await supabase
          .from('city_equipment')
          .update({ quantity: selectedEquipment.quantity - quantityToTake })
          .eq('id', selectedEquipment.city_equipment_id)

        if (updateError) {
          console.error('Error updating equipment quantity:', updateError)
        }
      }

      toast.success('הציוד הושאל בהצלחה!')
      setBorrowForm({ name: '', phone: '', equipment_id: '' })
      setEquipmentSearch('')
      setSelectedItems(new Set())
      setItemQuantities({})
      fetchEquipment()
    } catch (error) {
      console.error('Error borrowing equipment:', error)
      toast.error('אירעה שגיאה בהשאלת הציוד')
      fetchEquipment()
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

  const handleReturn = async (borrowId: string, equipmentId: string, equipmentStatus: 'working' | 'faulty' = 'working') => {
    // Validate that if status is faulty, notes must be provided
    if (equipmentStatus === 'faulty' && !faultyNotes.trim()) {
      toast.error('יש לפרט מה קרה לציוד התקול')
      return
    }

    // Validate that image is required
    if (!returnImage) {
      toast.error('יש לצלם תמונה של הציוד בארון לפני ההחזרה')
      return
    }

    setLoading(true)

    try {
      const updateData: any = {
        status: 'pending_approval',
        return_date: new Date().toISOString(),
        equipment_status: equipmentStatus
      }

      // Add notes if equipment is faulty
      if (equipmentStatus === 'faulty') {
        updateData.faulty_notes = faultyNotes.trim()
      }

      const { error: updateError } = await supabase
        .from('borrow_history')
        .update(updateData)
        .eq('id', borrowId)

      if (updateError) throw updateError

      // Upload return image
      setUploadingImage(true)
      const formData = new FormData()
      formData.append('file', returnImage)
      formData.append('historyId', borrowId)

      const uploadResponse = await fetch('/api/equipment/upload-return-image', {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        throw new Error('שגיאה בהעלאת תמונת ההחזרה')
      }

      // DON'T update equipment quantity here - wait for manager approval
      // The equipment will remain borrowed until manager approves

      toast.success('תמונת ההחזרה נשלחה! הציוד ממתין לאישור מנהל העיר.', { duration: 5000 })
      setReturnStatus(null)
      setSelectedStatus('working')
      setFaultyNotes('')
      setReturnImage(null)
      handleReturnSearch()
      fetchEquipment()
    } catch (error) {
      console.error('Error returning equipment:', error)
      toast.error('אירעה שגיאה בהחזרת הציוד')
    } finally {
      setLoading(false)
      setUploadingImage(false)
    }
  }

  // === REQUEST MODE FUNCTIONS ===

  const handleItemToggle = (equipmentId: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(equipmentId)) {
      newSelected.delete(equipmentId)
      const newQuantities = { ...itemQuantities }
      delete newQuantities[equipmentId]
      setItemQuantities(newQuantities)
    } else {
      newSelected.add(equipmentId)
      setItemQuantities({ ...itemQuantities, [equipmentId]: 1 })
    }
    setSelectedItems(newSelected)
  }

  const handleQuantityChange = (equipmentId: string, quantity: number) => {
    const item = equipment.find(eq => eq.id === equipmentId)
    if (item && quantity > 0 && quantity <= item.quantity) {
      setItemQuantities({ ...itemQuantities, [equipmentId]: quantity })
    }
  }

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!requestForm.requester_name || !requestForm.requester_phone) {
      toast.error('אנא מלא את כל השדות הנדרשים')
      return
    }

    // Validate name (at least 2 words)
    const nameParts = requestForm.requester_name.trim().split(/\s+/)
    if (nameParts.length < 2) {
      toast.error('יש להזין שם ושם משפחה (לפחות 2 מילים)')
      return
    }

    // Validate phone (exactly 10 digits, starts with 05)
    const phoneDigits = requestForm.requester_phone.replace(/\D/g, '')
    if (phoneDigits.length !== 10 || !phoneDigits.startsWith('05')) {
      toast.error('מספר טלפון חייב להיות 10 ספרות ולהתחיל ב-05')
      return
    }

    if (city?.require_call_id === true && !requestForm.call_id?.trim()) {
      toast.error('מזהה קריאה הוא שדה חובה')
      return
    }

    if (selectedItems.size === 0) {
      toast.error('אנא בחר לפחות פריט אחד')
      return
    }

    setLoading(true)

    try {
      // Check if city has distance limit and get user location if needed
      let userLocation: { lat: number; lng: number } | null = null
      const maxDistance = city?.max_request_distance_km

      if (maxDistance && maxDistance > 0) {
        // City has distance limit - need to get user location
        if (!navigator.geolocation) {
          throw new Error('הדפדפן שלך לא תומך בשירותי מיקום. אנא נסה דפדפן אחר.')
        }

        // Get current position - browser will show its own permission dialog
        userLocation = await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                lat: position.coords.latitude,
                lng: position.coords.longitude
              })
            },
            (error) => {
              let message = 'לא ניתן לקבל את המיקום שלך.'
              if (error.code === error.PERMISSION_DENIED) {
                message = 'גישה למיקום נדחתה. אנא אשר גישה למיקום בהגדרות הדפדפן ונסה שוב.'
              } else if (error.code === error.POSITION_UNAVAILABLE) {
                message = 'מיקום לא זמין. אנא ודא ששירותי המיקום פעילים.'
              } else if (error.code === error.TIMEOUT) {
                message = 'תם הזמן לקבלת מיקום. אנא נסה שוב.'
              }
              reject(new Error(message))
            },
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 60000
            }
          )
        })
      }

      const items = Array.from(selectedItems).map(equipmentId => ({
        equipment_id: equipmentId,
        quantity: itemQuantities[equipmentId] || 1
      }))

      const response = await fetch('/api/requests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester_name: requestForm.requester_name,
          requester_phone: requestForm.requester_phone,
          call_id: requestForm.call_id || undefined,
          requester_lat: userLocation?.lat,
          requester_lng: userLocation?.lng,
          items
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // Check if it's a distance error - show nice modal
        if (data.distance && data.maxDistance) {
          setDistanceError({
            distance: parseFloat(data.distance),
            maxDistance: data.maxDistance
          })
          setLoading(false)
          return
        }
        throw new Error(data.error || 'שגיאה ביצירת בקשה')
      }

      setCreatedToken(data.token)
      setRequestCreated(true)

    } catch (error: any) {
      console.error('Error creating request:', error)
      // Check if it's a location permission error
      if (error.message && error.message.includes('גישה למיקום נדחתה')) {
        toast.error('🔒 גישה למיקום נדחתה - יש לאפשר גישה למיקום בהגדרות הדפדפן', { duration: 6000 })
      } else if (error.message && error.message.includes('רחוק מדי')) {
        toast.error(error.message, { duration: 5000 })
      } else {
        toast.error(error.message || 'אירעה שגיאה ביצירת הבקשה')
      }
    } finally {
      setLoading(false)
    }
  }

  const getRequestUrl = () => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/request/${createdToken}`
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getRequestUrl())
    toast.success('הקישור הועתק ללוח!')
  }

  const resetRequestForm = () => {
    setRequestForm({ requester_name: '', requester_phone: '', call_id: '', items: [] })
    setSelectedItems(new Set())
    setItemQuantities({})
    setCreatedToken('')
    setRequestCreated(false)
  }

  // Helper functions for contact
  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`
  }

  const handleWhatsApp = (phone: string) => {
    // Convert phone to international format (972...)
    const cleanPhone = phone.replace(/\D/g, '')
    const internationalPhone = cleanPhone.startsWith('0') ? '972' + cleanPhone.slice(1) : cleanPhone
    window.open(`https://wa.me/${internationalPhone}`, '_blank')
  }

  // === RENDER ===

  if (!city) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">טוען...</p>
        </div>
      </div>
    )
  }

  const isRequestMode = city.request_mode === 'request'

  return (
    <div className="min-h-screen content-wrapper">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Logo />

        {/* Header */}
        <header className="bg-white/90 backdrop-blur-lg border border-gray-200/50 rounded-2xl shadow-xl p-4 sm:p-8 mb-6 sm:mb-8 sm:relative">
          {/* Desktop - Back button absolute positioned */}
          <Link href="/" className="hidden sm:block absolute left-6 top-6">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-3 rounded-full hover:bg-blue-50 text-blue-600 transition-all duration-200 hover:scale-105 border border-blue-200"
              title="חזרה לבחירת עיר"
            >
              ↩️ חזור לבחירת עיר
            </Button>
          </Link>

          {/* Mobile - Back button at top */}
          <div className="sm:hidden mb-4">
            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 rounded-full hover:bg-blue-50 text-blue-600 transition-all duration-200 hover:scale-105 border-2 border-blue-200"
              >
                ↩️ חזור
              </Button>
            </Link>
          </div>

          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              ארון ציוד ידידים - {city.name}
            </h1>
            <p className="text-gray-600 text-lg">
              {isRequestMode ? 'מערכת בקשות לאישור מנהל' : 'מערכת חכמה לניהול השאלות והחזרות'}
            </p>
          </div>
        </header>

        {/* Contact Details */}
        {(city.manager1_name || city.manager2_name) && (
          <Card className="mb-6 border-0 shadow-lg rounded-2xl overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="text-xl">👥</span>
                <span>צור קשר</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Manager 1 */}
                {city.manager1_name && city.manager1_phone && (
                  <div className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">👤</span>
                      <span className="font-semibold text-gray-800">{city.manager1_name}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleWhatsApp(city.manager1_phone!)}
                        variant="outline"
                        size="sm"
                        className="h-9 px-3 rounded-full hover:bg-green-50 text-green-600 border-green-200 transition-all duration-200 hover:scale-105"
                        title="שלח הודעה בוואטסאפ"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleCall(city.manager1_phone!)}
                        variant="outline"
                        size="sm"
                        className="h-9 px-3 rounded-full hover:bg-blue-50 text-blue-600 border-blue-200 transition-all duration-200 hover:scale-105"
                        title="התקשר"
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Manager 2 */}
                {city.manager2_name && city.manager2_phone && (
                  <div className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">👤</span>
                      <span className="font-semibold text-gray-800">{city.manager2_name}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleWhatsApp(city.manager2_phone!)}
                        variant="outline"
                        size="sm"
                        className="h-9 px-3 rounded-full hover:bg-green-50 text-green-600 border-green-200 transition-all duration-200 hover:scale-105"
                        title="שלח הודעה בוואטסאפ"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleCall(city.manager2_phone!)}
                        variant="outline"
                        size="sm"
                        className="h-9 px-3 rounded-full hover:bg-blue-50 text-blue-600 border-blue-200 transition-all duration-200 hover:scale-105"
                        title="התקשר"
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Links - Separate Card */}
        {!city.hide_navigation && ((city.lat && city.lng) || city.location_url) && (
          <Card className="mb-6 border-0 shadow-lg rounded-2xl overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50">
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="text-xl">🗺️</span>
                <span>ניווט למיקום</span>
              </h3>
              <div className="flex gap-3 justify-center sm:justify-start">
                {/* Google Maps */}
                {city.lat && city.lng && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${city.lat},${city.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none"
                  >
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto h-12 px-6 rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-blue-600 font-semibold transition-all duration-200 hover:scale-105"
                    >
                      <span className="text-xl ml-2">📍</span>
                      Google Maps
                    </Button>
                  </a>
                )}

                {/* Waze */}
                {city.lat && city.lng && (
                  <a
                    href={`https://www.waze.com/ul?ll=${city.lat},${city.lng}&navigate=yes`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none"
                  >
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto h-12 px-6 rounded-xl border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 text-purple-600 font-semibold transition-all duration-200 hover:scale-105"
                    >
                      <span className="text-xl ml-2">🚗</span>
                      Waze
                    </Button>
                  </a>
                )}

                {/* Custom Location URL */}
                {city.location_url && !city.lat && (
                  <a
                    href={city.location_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none"
                  >
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto h-12 px-6 rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-blue-600 font-semibold transition-all duration-200 hover:scale-105"
                    >
                      <span className="text-xl ml-2">📍</span>
                      מיקום
                    </Button>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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
            <span className="text-2xl ml-2">{isRequestMode ? '📝' : '📦'}</span> {isRequestMode ? 'בקשת ציוד' : 'השאלת ציוד'}
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

        {/* === REQUEST MODE === */}
        {isRequestMode && activeTab === 'borrow' && !requestCreated && (
          <Card id="request-form" className="border-0 shadow-2xl rounded-2xl overflow-visible bg-white/90 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-6">
              <CardTitle className="text-2xl font-bold text-gray-800">בקשה חדשה לציוד</CardTitle>
              <CardDescription className="text-gray-600 text-base">מלא את הפרטים ובחר ציוד מהרשימה</CardDescription>
            </CardHeader>
            <CardContent className="p-6 overflow-visible">
              <form onSubmit={handleCreateRequest} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">👤 שם מלא *</label>
                    <Input
                      value={requestForm.requester_name}
                      onChange={(e) => setRequestForm({ ...requestForm, requester_name: e.target.value })}
                      placeholder="הזן את שמך המלא"
                      className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">📱 מספר טלפון *</label>
                    <Input
                      type="tel"
                      value={requestForm.requester_phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '')
                        if (value.length <= 10) {
                          setRequestForm({ ...requestForm, requester_phone: value })
                        }
                      }}
                      placeholder="0501234567"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                {city?.require_call_id === true && (
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">🆔 מזהה קריאה *</label>
                    <Input
                      value={requestForm.call_id}
                      onChange={(e) => setRequestForm({ ...requestForm, call_id: e.target.value })}
                      placeholder="הזן מזהה קריאה"
                      className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-gray-700">🎒 בחר ציוד (ניתן לבחור מספר פריטים)</label>
                    <Button
                      type="button"
                      onClick={() => setIsTableExpanded(!isTableExpanded)}
                      className="h-8 px-4 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg transition-colors"
                    >
                      {isTableExpanded ? '🔼 צמצם' : '🔽 הרחב'}
                    </Button>
                  </div>

                  {isTableExpanded && (
                    <>
                      {/* Search Field */}
                      <div className="relative">
                        <Input
                          type="text"
                          value={equipmentSearch}
                          onChange={(e) => setEquipmentSearch(e.target.value)}
                          placeholder="🔍 חפש ציוד..."
                          className="h-12 border-2 border-gray-300 rounded-xl pr-10 focus:border-blue-500 transition-colors"
                        />
                        {equipmentSearch && (
                          <button
                            type="button"
                            onClick={() => setEquipmentSearch('')}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <div className="max-h-96 overflow-x-auto overflow-y-auto border-2 border-gray-200 rounded-xl">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-right font-semibold text-gray-700 border-b border-gray-300">בחר</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-700 border-b border-gray-300">שם פריט</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b border-gray-300">כמות זמינה</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b border-gray-300">סטטוס</th>
                        </tr>
                      </thead>
                      <tbody>
                        {equipment
                          .filter(item => item.quantity > 0 && item.equipment_status === 'working')
                          .filter(item => item.name.toLowerCase().includes(equipmentSearch.toLowerCase()))
                          .sort((a, b) => {
                            // Selected items first
                            const aSelected = selectedItems.has(a.id)
                            const bSelected = selectedItems.has(b.id)
                            if (aSelected && !bSelected) return -1
                            if (!aSelected && bSelected) return 1
                            // Then sort alphabetically
                            return a.name.localeCompare(b.name)
                          })
                          .map(item => (
                            <tr key={item.id} className="hover:bg-blue-50 transition-colors border-b border-gray-200">
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={selectedItems.has(item.id)}
                                  onChange={() => handleItemToggle(item.id)}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-3 py-2 font-medium text-gray-800">
                                {item.name}
                              </td>
                              <td className="px-3 py-2 text-center text-gray-600">
                                {item.quantity}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {item.is_consumable ? (
                                  <div className="flex flex-col items-center gap-2">
                                    <span className="inline-block text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">אין צורך להחזיר</span>
                                    {selectedItems.has(item.id) && (
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleQuantityChange(item.id, Math.max(1, (itemQuantities[item.id] || 1) - 1))}
                                          disabled={(itemQuantities[item.id] || 1) <= 1}
                                          className="w-6 h-6 flex items-center justify-center bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded text-xs"
                                        >
                                          -
                                        </button>
                                        <span className="w-8 h-6 flex items-center justify-center font-bold text-xs text-gray-800 bg-white border border-gray-300 rounded">
                                          {itemQuantities[item.id] || 1}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleQuantityChange(item.id, Math.min(item.quantity, (itemQuantities[item.id] || 1) + 1))}
                                          disabled={(itemQuantities[item.id] || 1) >= item.quantity}
                                          className="w-6 h-6 flex items-center justify-center bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded text-xs"
                                        >
                                          +
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-xs">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        {equipment
                          .filter(item => item.quantity > 0 && item.equipment_status === 'working')
                          .filter(item => item.name.toLowerCase().includes(equipmentSearch.toLowerCase()))
                          .length === 0 && (
                          <tr>
                            <td colSpan={4} className="text-center py-8 text-gray-500">
                              {equipmentSearch ? 'לא נמצא ציוד התואם לחיפוש' : 'אין ציוד זמין כרגע'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                      </div>
                    </>
                  )}

                  {/* Selected Items Summary */}
                  {selectedItems.size > 0 && (
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">✅ פריטים שנבחרו ({selectedItems.size}):</p>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(selectedItems).map(id => {
                          const item = equipment.find(eq => eq.id === id)
                          return (
                            <div key={id} className="bg-white px-3 py-1 rounded-lg border border-blue-300 text-sm">
                              <span className="font-medium">{item?.name}</span>
                              {item?.is_consumable && (
                                <span className="text-blue-600 font-bold mr-1">×{itemQuantities[id] || 1}</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading || selectedItems.size === 0}
                  className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? '⏳ שולח בקשה...' : '✅ שלח בקשה למנהל'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Request Created Success */}
        {isRequestMode && activeTab === 'borrow' && requestCreated && (
          <Card className="border-0 shadow-2xl rounded-2xl overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-100 pb-6">
              <div className="text-center">
                <div className="text-6xl mb-4">✅</div>
                <CardTitle className="text-3xl font-bold text-green-900">הבקשה נשלחה בהצלחה!</CardTitle>
                <CardDescription className="text-green-800 text-lg mt-2">
                  הבקשה שלך נשלחה למנהל העיר לאישור
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="bg-white rounded-xl p-6 border-2 border-green-200">
                <p className="text-sm font-semibold text-gray-700 mb-3">📋 סיכום הבקשה:</p>
                <div className="space-y-2 text-gray-700">
                  <p><span className="font-semibold">שם:</span> {requestForm.requester_name}</p>
                  <p><span className="font-semibold">טלפון:</span> {requestForm.requester_phone}</p>
                  {requestForm.call_id && (
                    <p><span className="font-semibold">מזהה קריאה:</span> {requestForm.call_id}</p>
                  )}
                  <p className="font-semibold mt-3">פריטים שנבחרו:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {Array.from(selectedItems).map(id => {
                      const item = equipment.find(eq => eq.id === id)
                      return (
                        <li key={id}>
                          {item?.name} {item?.is_consumable ? `(כמות: ${itemQuantities[id] || 1})` : ''}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
                <p className="text-sm font-semibold text-gray-700 mb-3 text-center">🔗 הבקשה שלך מוכנה!</p>
                <p className="text-sm text-gray-600 mb-4 text-center">לחץ על הכפתור למטה כדי לפתוח את דף הבקשה</p>
                <Button
                  onClick={() => window.open(getRequestUrl(), '_blank')}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  🔗 פתח את הבקשה
                </Button>
              </div>

              <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200">
                <p className="text-sm text-yellow-800">
                  💡 <span className="font-semibold">שים לב:</span> הטוקן תקף ל-30 דקות. אחרי אישור המנהל תוכל לגשת לדף הבקשה ולראות את קוד הארון.
                </p>
              </div>

              <Button
                onClick={resetRequestForm}
                className="w-full h-12 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-xl"
              >
                🔄 צור בקשה נוספת
              </Button>
            </CardContent>
          </Card>
        )}

        {/* === DIRECT MODE (Existing) === */}
        {!isRequestMode && activeTab === 'borrow' && (
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
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-gray-700">🎒 בחר ציוד (ניתן לבחור מספר פריטים)</label>
                    <Button
                      type="button"
                      onClick={() => setIsTableExpanded(!isTableExpanded)}
                      className="h-8 px-4 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg transition-colors"
                    >
                      {isTableExpanded ? '🔼 צמצם' : '🔽 הרחב'}
                    </Button>
                  </div>

                  {isTableExpanded && (
                    <>
                      {/* Search Field */}
                      <div className="relative">
                        <Input
                          type="text"
                          value={equipmentSearch}
                          onChange={(e) => setEquipmentSearch(e.target.value)}
                          placeholder="🔍 חפש ציוד..."
                          className="h-12 border-2 border-gray-300 rounded-xl pr-10 focus:border-blue-500 transition-colors"
                        />
                        {equipmentSearch && (
                          <button
                            type="button"
                            onClick={() => setEquipmentSearch('')}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <div className="max-h-96 overflow-x-auto overflow-y-auto border-2 border-gray-200 rounded-xl">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-right font-semibold text-gray-700 border-b border-gray-300">בחר</th>
                              <th className="px-3 py-2 text-right font-semibold text-gray-700 border-b border-gray-300">שם פריט</th>
                              <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b border-gray-300">כמות זמינה</th>
                              <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b border-gray-300">סטטוס</th>
                            </tr>
                          </thead>
                          <tbody>
                            {equipment
                              .filter(item => item.quantity > 0 && item.equipment_status === 'working')
                              .filter(item => item.name.toLowerCase().includes(equipmentSearch.toLowerCase()))
                              .sort((a, b) => {
                                // Selected items first
                                const aSelected = selectedItems.has(a.id)
                                const bSelected = selectedItems.has(b.id)
                                if (aSelected && !bSelected) return -1
                                if (!aSelected && bSelected) return 1
                                // Then sort alphabetically
                                return a.name.localeCompare(b.name)
                              })
                              .map(item => (
                                <tr key={item.id} className="hover:bg-blue-50 transition-colors border-b border-gray-200">
                                  <td className="px-3 py-2">
                                    <input
                                      type="checkbox"
                                      checked={selectedItems.has(item.id)}
                                      onChange={() => handleItemToggle(item.id)}
                                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                  </td>
                                  <td className="px-3 py-2 font-medium text-gray-800">
                                    {item.name}
                                  </td>
                                  <td className="px-3 py-2 text-center text-gray-600">
                                    {item.quantity}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {item.is_consumable ? (
                                      <div className="flex flex-col items-center gap-2">
                                        <span className="inline-block text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">אין צורך להחזיר</span>
                                        {selectedItems.has(item.id) && (
                                          <div className="flex items-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() => handleQuantityChange(item.id, Math.max(1, (itemQuantities[item.id] || 1) - 1))}
                                              disabled={(itemQuantities[item.id] || 1) <= 1}
                                              className="w-6 h-6 flex items-center justify-center bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded text-xs"
                                            >
                                              -
                                            </button>
                                            <span className="w-8 h-6 flex items-center justify-center font-bold text-xs text-gray-800 bg-white border border-gray-300 rounded">
                                              {itemQuantities[item.id] || 1}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => handleQuantityChange(item.id, Math.min(item.quantity, (itemQuantities[item.id] || 1) + 1))}
                                              disabled={(itemQuantities[item.id] || 1) >= item.quantity}
                                              className="w-6 h-6 flex items-center justify-center bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded text-xs"
                                            >
                                              +
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 text-xs">-</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            {equipment
                              .filter(item => item.quantity > 0 && item.equipment_status === 'working')
                              .filter(item => item.name.toLowerCase().includes(equipmentSearch.toLowerCase()))
                              .length === 0 && (
                              <tr>
                                <td colSpan={4} className="text-center py-8 text-gray-500">
                                  {equipmentSearch ? 'לא נמצא ציוד התואם לחיפוש' : 'אין ציוד זמין כרגע'}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {/* Selected Items Summary */}
                  {selectedItems.size > 0 && (
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">✅ פריטים שנבחרו ({selectedItems.size}):</p>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(selectedItems).map(id => {
                          const item = equipment.find(eq => eq.id === id)
                          return (
                            <div key={id} className="bg-white px-3 py-1 rounded-lg border border-blue-300 text-sm">
                              <span className="font-medium">{item?.name}</span>
                              {item?.is_consumable && (
                                <span className="text-blue-600 font-bold mr-1">×{itemQuantities[id] || 1}</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={loading || selectedItems.size === 0}
                  className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? '⏳ מעבד...' : '✅ השאל ציוד עכשיו'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Return Tab (Same for both modes) */}
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
                        <div key={borrow.id} className="border-2 border-blue-200 rounded-xl overflow-hidden">
                          <div className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-50 to-indigo-50 hover:shadow-lg transition-all duration-200">
                            <div className="flex-1">
                              <p className="font-bold text-lg text-gray-800">{borrow.equipment_name}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                🕐 הושאל: {new Date(borrow.borrow_date).toLocaleDateString('he-IL')}
                              </p>
                            </div>
                            <Button
                              onClick={() => {
                                setReturnStatus({ borrowId: borrow.id, equipmentId: borrow.equipment_id })
                                setSelectedStatus('working')
                              }}
                              disabled={loading}
                              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold px-6 py-2 rounded-xl shadow-md hover:shadow-lg transition-all"
                            >
                              ✅ החזר
                            </Button>
                          </div>

                          {/* Status Selection Dialog */}
                          {returnStatus && returnStatus.borrowId === borrow.id && (
                            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-t-2 border-yellow-200 p-6">
                              <h4 className="font-bold text-gray-900 mb-3">מה מצב הציוד שמוחזר?</h4>

                              <div className="grid grid-cols-2 gap-3 mb-4">
                                <button
                                  onClick={() => {
                                    setSelectedStatus('working')
                                    setFaultyNotes('')
                                  }}
                                  className={`p-4 rounded-xl border-2 font-semibold transition-all ${
                                    selectedStatus === 'working'
                                      ? 'bg-green-100 border-green-500 text-green-800 shadow-md scale-105'
                                      : 'bg-white border-gray-300 text-gray-700 hover:border-green-300'
                                  }`}
                                >
                                  <div className="text-2xl mb-1">✅</div>
                                  <div>תקין</div>
                                </button>

                                <button
                                  onClick={() => setSelectedStatus('faulty')}
                                  className={`p-4 rounded-xl border-2 font-semibold transition-all ${
                                    selectedStatus === 'faulty'
                                      ? 'bg-orange-100 border-orange-500 text-orange-800 shadow-md scale-105'
                                      : 'bg-white border-gray-300 text-gray-700 hover:border-orange-300'
                                  }`}
                                >
                                  <div className="text-2xl mb-1">⚠️</div>
                                  <div>תקול</div>
                                </button>
                              </div>

                              {/* Faulty Notes - Required when status is faulty */}
                              {selectedStatus === 'faulty' && (
                                <div className="mb-4 p-4 bg-orange-50 border-2 border-orange-200 rounded-xl">
                                  <label className="block text-sm font-bold text-orange-800 mb-2">
                                    ⚠️ פרט מה קרה לציוד (חובה) *
                                  </label>
                                  <textarea
                                    value={faultyNotes}
                                    onChange={(e) => setFaultyNotes(e.target.value)}
                                    placeholder="למשל: שבור, חסר חלקים, לא עובד, וכו..."
                                    className="w-full p-3 border-2 border-orange-300 rounded-lg focus:border-orange-500 focus:outline-none resize-none"
                                    rows={3}
                                    required
                                  />
                                  <p className="text-xs text-orange-600 mt-1">
                                    נא לתאר בקצרה את מצב הציוד והבעיה
                                  </p>
                                </div>
                              )}

                              {/* צילום תמונת החזרה - חובה */}
                              <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                                <label className="block text-sm font-bold text-blue-800 mb-3">
                                  📸 תמונת הציוד בארון (חובה) *
                                </label>
                                {!returnImage ? (
                                  <Button
                                    type="button"
                                    onClick={() => setShowCamera(true)}
                                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold py-3 rounded-lg"
                                  >
                                    📷 צלם תמונה
                                  </Button>
                                ) : (
                                  <div>
                                    <div className="mb-2 p-2 bg-green-50 border border-green-300 rounded-lg flex items-center justify-between">
                                      <span className="text-sm text-green-700 font-semibold">✅ תמונה נוספה</span>
                                      <Button
                                        type="button"
                                        onClick={() => setShowCamera(true)}
                                        size="sm"
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        צלם שוב
                                      </Button>
                                    </div>
                                  </div>
                                )}
                                <p className="text-xs text-blue-600 mt-2">
                                  יש לצלם תמונה של הציוד בארון לאחר ההחזרה
                                </p>
                              </div>

                              <div className="flex gap-3">
                                <Button
                                  onClick={() => handleReturn(returnStatus.borrowId, returnStatus.equipmentId, selectedStatus)}
                                  disabled={loading || uploadingImage || !returnImage}
                                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {uploadingImage ? 'מעלה תמונה...' : 'אשר החזרה'}
                                </Button>
                                <Button
                                  onClick={() => {
                                    setReturnStatus(null)
                                    setSelectedStatus('working')
                                    setFaultyNotes('')
                                    setReturnImage(null)
                                  }}
                                  variant="outline"
                                  className="border-2 border-gray-300 rounded-xl"
                                  disabled={loading || uploadingImage}
                                >
                                  ביטול
                                </Button>
                              </div>
                            </div>
                          )}
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
        <Card className="mt-8 border-0 shadow-2xl rounded-2xl bg-white">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-6">
            <CardTitle className="text-2xl font-bold text-gray-800">📊 מלאי ציוד</CardTitle>
            <CardDescription className="text-gray-600">סטטוס זמינות ציוד במערכת</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {/* Category Quick Navigation - Icon Grid Style */}
            {(() => {
              // Get unique categories with their icons
              const categoryMap = new Map()
              equipment.forEach((item: any) => {
                if (item.category?.name) {
                  categoryMap.set(item.category.name, item.category.icon || '📦')
                }
              })
              const categories = Array.from(categoryMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))

              return categories.length > 0 ? (
                <div className="sticky top-0 z-50 -mt-2 pt-3 mb-4 -mx-4 sm:-mx-6 px-4 sm:px-6">
                  {/* Background layer */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-blue-50 shadow-md border-b-2 border-blue-100"></div>

                  {/* Categories - Horizontal scroll */}
                  <div className="relative flex sm:grid sm:grid-cols-6 md:grid-cols-8 gap-2 sm:gap-4 overflow-x-auto pb-2 sm:pb-3 scrollbar-hide">
                    {/* All Categories Button */}
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`relative flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md flex-shrink-0 ${
                        selectedCategory === null
                          ? 'bg-blue-500 border-blue-600 text-white'
                          : 'bg-white border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                    >
                      <div className="w-12 h-12 sm:w-20 sm:h-20 flex items-center justify-center">
                        <span className="text-3xl sm:text-5xl">📦</span>
                      </div>
                      <span className={`text-[9px] sm:text-xs font-bold text-center leading-tight whitespace-nowrap ${
                        selectedCategory === null ? 'text-white' : 'text-gray-700'
                      }`}>
                        הכל
                      </span>
                    </button>

                    {categories.map(([categoryName, icon]) => (
                      <button
                        key={categoryName}
                        onClick={() => setSelectedCategory(categoryName)}
                        className={`relative flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md flex-shrink-0 ${
                          selectedCategory === categoryName
                            ? 'bg-blue-500 border-blue-600 text-white'
                            : 'bg-white border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                        }`}
                      >
                        {/* Display image or fallback icon */}
                        <div className="w-12 h-12 sm:w-20 sm:h-20 flex items-center justify-center">
                          {icon && icon.startsWith('http') ? (
                            <img
                              src={icon}
                              alt={categoryName}
                              className="w-full h-full object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <span className="text-3xl sm:text-5xl">{icon || '📦'}</span>
                          )}
                        </div>
                        <span className={`text-[9px] sm:text-xs font-bold text-center leading-tight whitespace-nowrap ${
                          selectedCategory === categoryName ? 'text-white' : 'text-gray-700'
                        }`}>
                          {categoryName}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Selected Items Summary - Mobile Only - Inside sticky container */}
                  {selectedItems.size > 0 && activeTab === 'borrow' && (
                    <div className="relative sm:hidden pb-2 pt-2">
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-gray-700 mb-1.5">✅ נבחרו ({selectedItems.size}):</p>
                            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                              {Array.from(selectedItems).map(id => {
                                const item = equipment.find(eq => eq.id === id)
                                return (
                                  <div key={id} className="bg-white px-2 py-0.5 rounded-md border border-blue-300 text-xs">
                                    <span className="font-medium">{item?.name}</span>
                                    {item?.is_consumable && (
                                      <span className="text-blue-600 font-bold mr-1">×{itemQuantities[id] || 1}</span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                          {/* Quick Submit Button */}
                          {city?.request_mode === 'request' && (
                            <button
                              type="button"
                              disabled={loading}
                              onClick={(e) => {
                                e.preventDefault()
                                // Submit the form directly
                                const form = document.querySelector('form[class*="space-y-6"]') as HTMLFormElement
                                if (form) {
                                  form.requestSubmit()
                                }
                              }}
                              className="flex-shrink-0 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold h-10 w-10 rounded-xl shadow-lg transition-all flex items-center justify-center"
                            >
                              {loading ? (
                                <span className="animate-spin">⏳</span>
                              ) : (
                                <span className="text-lg">➤</span>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null
            })()}

            {/* Equipment by Category */}
            {(() => {
              const categories = Array.from(new Set(equipment.map((item: any) => item.category?.name).filter(Boolean))).sort()
              const categoriesToShow = selectedCategory ? [selectedCategory] : categories

              return categoriesToShow.map((categoryName) => (
                <div key={categoryName} id={`category-${categoryName}`} className="mb-8 last:mb-0">
                  <h3 className="text-lg font-bold text-gray-800 mb-3 pb-2 border-b-2 border-blue-200">
                    {categoryName}
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                    {equipment
                      .filter((item: any) => item.category?.name === categoryName)
                      .sort((a: any, b: any) => {
                        // Sort by display_order first (lower number = higher priority)
                        const orderA = a.display_order ?? 999
                        const orderB = b.display_order ?? 999
                        if (orderA !== orderB) {
                          return orderA - orderB
                        }
                        // Then sort by name alphabetically
                        return a.name.localeCompare(b.name)
                      })
                      .map((item: any) => {
                        // Determine border color based on status
                        let borderColor = 'border-red-500'
                        if (item.equipment_status === 'faulty') {
                          borderColor = 'border-orange-500'
                        } else if (item.quantity > 0) {
                          borderColor = 'border-green-500'
                        }

                        const isSelected = selectedItems.has(item.id)
                        const selectedQuantity = itemQuantities[item.id] || 1
                        const canSelectFromGrid = activeTab === 'borrow' && item.quantity > 0 && item.equipment_status === 'working' && (isRequestMode ? !requestCreated : true)

                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              if (!canSelectFromGrid && !isSelected) return

                              if (isSelected) {
                                // Remove from selection
                                const newSelected = new Set(selectedItems)
                                newSelected.delete(item.id)
                                setSelectedItems(newSelected)
                                const newQuantities = { ...itemQuantities }
                                delete newQuantities[item.id]
                                setItemQuantities(newQuantities)
                              } else {
                                // Add to selection
                                setSelectedItems(new Set(selectedItems).add(item.id))
                                setItemQuantities({ ...itemQuantities, [item.id]: 1 })
                              }
                            }}
                            className={`relative bg-gradient-to-br from-white to-gray-50 rounded-xl p-2 border-2 ${borderColor} ${
                              isSelected ? 'ring-4 ring-blue-400 shadow-xl scale-105' : canSelectFromGrid ? 'hover:shadow-lg cursor-pointer' : 'cursor-default'
                            } transition-all duration-200 ${canSelectFromGrid || isSelected ? 'opacity-100' : 'opacity-75'} flex flex-col min-h-[140px]`}
                          >
                            {/* Category Badge - Top Left */}
                            {item.category?.name && (
                              <div className="absolute top-1 left-1 bg-blue-600 text-white text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-md font-bold shadow-sm z-10">
                                {item.category.name}
                              </div>
                            )}

                            {/* Selection Badge - Top Right */}
                            {isSelected && (
                              <div className="absolute top-1 right-1 bg-green-600 text-white text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm z-10 flex items-center gap-1">
                                ✓ {selectedQuantity}
                              </div>
                            )}

                            {/* Image or Emoji - LARGER */}
                            <div className="flex-1 flex items-center justify-center px-1 py-1">
                              {item.image_url && item.image_url.startsWith('http') ? (
                                <img src={item.image_url} alt={item.name} className="max-w-full max-h-full object-contain rounded-lg" loading="lazy" />
                              ) : (
                                <span className="text-4xl sm:text-5xl">{item.image_url || '📦'}</span>
                              )}
                            </div>

                            {/* Item Name - BOLD with 2 lines */}
                            <div className="text-center px-0.5 pb-1">
                              <span
                                className="font-bold text-gray-800 text-[9px] sm:text-[10px] leading-tight block overflow-hidden line-clamp-2"
                                title={item.name}
                              >
                                {item.name}
                              </span>
                            </div>

                            {/* Quantity - Plain Text */}
                            <div className="text-center">
                              <span className={`text-sm font-bold ${
                                item.quantity > 0 ? 'text-green-700' : 'text-red-700'
                              }`}>
                                כמות: {item.quantity}
                              </span>
                            </div>

                            {/* Quantity Selector - Show when selected and consumable */}
                            {isSelected && item.is_consumable && (
                              <div className="mt-2 flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => {
                                    const newQty = Math.max(1, selectedQuantity - 1)
                                    setItemQuantities({ ...itemQuantities, [item.id]: newQty })
                                  }}
                                  className="w-6 h-6 bg-blue-500 text-white rounded-full font-bold hover:bg-blue-600"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center font-bold text-sm">{selectedQuantity}</span>
                                <button
                                  onClick={() => {
                                    const newQty = Math.min(item.quantity, selectedQuantity + 1)
                                    setItemQuantities({ ...itemQuantities, [item.id]: newQty })
                                  }}
                                  className="w-6 h-6 bg-blue-500 text-white rounded-full font-bold hover:bg-blue-600"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </button>
                        )
                      })}
                  </div>
                </div>
              ))
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Camera Capture Modal */}
      {showCamera && (
        <CameraCapture
          onCapture={(file) => {
            setReturnImage(file)
            setShowCamera(false)
          }}
          onCancel={() => setShowCamera(false)}
          maxSizeKB={500}
          requireRecent={true}
          maxAgeMinutes={5}
        />
      )}

      {/* Temporary Closure Modal */}
      {city?.is_temporarily_closed && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-center">
              <div className="text-6xl mb-3">🚧</div>
              <h2 className="text-2xl font-bold text-white">הארון סגור זמנית</h2>
            </div>

            {/* Content */}
            <div className="p-6 text-center">
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 mb-6">
                <p className="text-gray-800 text-lg font-semibold mb-2">
                  הארון בעיר {city.name} אינו זמין כרגע
                </p>
                {city.closure_message && (
                  <p className="text-gray-600 mt-2">
                    {city.closure_message}
                  </p>
                )}
              </div>

              <p className="text-gray-600 text-sm mb-6">
                לבירורים ניתן לפנות למנהל הארון:
              </p>

              {/* Manager Contacts */}
              <div className="space-y-3">
                {city.manager1_name && city.manager1_phone && (
                  <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                    <p className="font-bold text-gray-800 mb-3">{city.manager1_name}</p>
                    <div className="flex gap-3 justify-center">
                      <a
                        href={`tel:${city.manager1_phone}`}
                        className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-xl transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        <span>התקשר</span>
                      </a>
                      <button
                        onClick={() => handleWhatsApp(city.manager1_phone!)}
                        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-xl transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>וואטסאפ</span>
                      </button>
                    </div>
                  </div>
                )}

                {city.manager2_name && city.manager2_phone && (
                  <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                    <p className="font-bold text-gray-800 mb-3">{city.manager2_name}</p>
                    <div className="flex gap-3 justify-center">
                      <a
                        href={`tel:${city.manager2_phone}`}
                        className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-xl transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        <span>התקשר</span>
                      </a>
                      <button
                        onClick={() => handleWhatsApp(city.manager2_phone!)}
                        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-xl transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>וואטסאפ</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Back to Home Button */}
              <Link href="/" className="block mt-6">
                <Button className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl">
                  ↩️ חזור לבחירת עיר
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Distance Error Modal */}
      {distanceError && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-center">
              <div className="text-6xl mb-2">📍</div>
              <h2 className="text-xl font-bold text-white">מצטערים!</h2>
            </div>

            {/* Content */}
            <div className="p-6 text-center">
              <p className="text-gray-800 text-lg font-semibold mb-4">
                אתה נמצא רחוק מדי מהארון
              </p>

              <div className="bg-gray-100 rounded-xl p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">המרחק שלך:</span>
                  <span className="font-bold text-red-600">{distanceError.distance.toFixed(1)} ק"מ</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">טווח מותר:</span>
                  <span className="font-bold text-green-600">{distanceError.maxDistance} ק"מ</span>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-6">
                נסה לגשת לארון קרוב יותר למיקומך, או פנה למנהל הארון לקבלת סיוע.
              </p>

              {/* Manager Contact */}
              {city?.manager1_phone && (
                <a
                  href={`tel:${city.manager1_phone}`}
                  className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-colors mb-3"
                >
                  <span>📞</span>
                  <span>התקשר למנהל</span>
                </a>
              )}

              <button
                onClick={() => setDistanceError(null)}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-xl transition-colors"
              >
                הבנתי
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Admin Bar - Show when logged in as admin (hidden when inside iframe) */}
      {adminUrl && !hideAdminBar && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">👁️</span>
            <span className="text-sm font-medium">צפייה בממשק מתנדב</span>
          </div>
          <Link href={adminUrl}>
            <Button className="bg-white text-purple-600 hover:bg-purple-50 font-bold px-4 py-2 rounded-xl transition-all hover:scale-105">
              ⚙️ חזרה לניהול
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
