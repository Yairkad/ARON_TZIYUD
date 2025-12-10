'use client'

import { useState, useEffect, use, useRef } from 'react'
import Link from 'next/link'
import toast, { Toaster } from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { isPushSupported, requestNotificationPermission, registerServiceWorker, getPushNotSupportedReason } from '@/lib/push'

interface Wheel {
  id: string
  wheel_number: string
  rim_size: string
  bolt_count: number
  bolt_spacing: number
  category: string | null
  is_donut: boolean
  notes: string | null
  is_available: boolean
  current_borrow?: {
    id: string
    borrower_name: string
    borrower_phone: string
    borrower_id_number?: string
    borrower_address?: string
    vehicle_model?: string
    borrow_date: string
    expected_return_date?: string
    deposit_type?: string
    deposit_details?: string
    is_signed?: boolean
    signed_at?: string
  }
}

interface BorrowRecord {
  id: string
  wheel_id: string
  borrower_name: string
  borrower_phone: string
  borrower_id_number?: string
  borrower_address?: string
  vehicle_model?: string
  borrow_date: string
  expected_return_date?: string
  actual_return_date?: string
  deposit_type?: string
  deposit_details?: string
  notes?: string
  status: string
  is_signed: boolean
  signed_at?: string
  created_at: string
  wheels?: {
    wheel_number: string
    rim_size: string
    bolt_count: number
    bolt_spacing: number
  }
}

interface Manager {
  id: string
  full_name: string
  phone: string
  role: string
  is_primary: boolean
}

interface PaymentMethods {
  cash?: boolean
  bit?: { enabled: boolean; phone: string }
  paybox?: { enabled: boolean; phone: string }
  bank_transfer?: { enabled: boolean; details: string }
  id_deposit?: boolean
  license_deposit?: boolean
}

interface Station {
  id: string
  name: string
  address: string
  wheels: Wheel[]
  wheel_station_managers: Manager[]
  totalWheels: number
  availableWheels: number
  deposit_amount?: number
  payment_methods?: PaymentMethods
}

interface WheelForm {
  wheel_number: string
  rim_size: string
  bolt_count: string
  bolt_spacing: string
  category: string
  is_donut: boolean
  notes: string
}

type ViewMode = 'cards' | 'table'
type PageTab = 'wheels' | 'tracking'

export default function StationPage({ params }: { params: Promise<{ stationId: string }> }) {
  const { stationId } = use(params)
  const [station, setStation] = useState<Station | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Manager mode
  const [isManager, setIsManager] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginPhone, setLoginPhone] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [currentManager, setCurrentManager] = useState<Manager | null>(null)
  const [sessionPassword, setSessionPassword] = useState('')
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' })

  // Password visibility toggles
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Confirm dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmDialogData, setConfirmDialogData] = useState<{
    title: string
    message: string
    onConfirm: () => void
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'warning' | 'info'
  } | null>(null)

  // Modals
  const [showAddWheelModal, setShowAddWheelModal] = useState(false)
  const [showEditWheelModal, setShowEditWheelModal] = useState(false)
  const [selectedWheel, setSelectedWheel] = useState<Wheel | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Forms
  const [wheelForm, setWheelForm] = useState<WheelForm>({
    wheel_number: '',
    rim_size: '',
    bolt_count: '4',
    bolt_spacing: '',
    category: '',
    is_donut: false,
    notes: ''
  })

  // Form validation errors (highlight missing fields)
  const [wheelFormErrors, setWheelFormErrors] = useState<string[]>([])
  const [showCustomCategory, setShowCustomCategory] = useState(false)

  // Mobile tracking cards - track which cards are expanded (collapsed by default)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  // Predefined categories
  const predefinedCategories = ['מכוניות גרמניות', 'מכוניות צרפתיות', 'מכוניות יפניות וקוראניות']

  // Filters
  const [rimSizeFilter, setRimSizeFilter] = useState('')
  const [boltCountFilter, setBoltCountFilter] = useState('')
  const [boltSpacingFilter, setBoltSpacingFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState('')
  const [tireSizeWidth, setTireSizeWidth] = useState('')
  const [tireSizeRatio, setTireSizeRatio] = useState('')

  const clearAllFilters = () => {
    setRimSizeFilter('')
    setBoltCountFilter('')
    setBoltSpacingFilter('')
    setCategoryFilter('')
    setTypeFilter('')
    setAvailabilityFilter('')
    setTireSizeWidth('')
    setTireSizeRatio('')
  }

  const hasActiveFilters = rimSizeFilter || boltCountFilter || boltSpacingFilter || categoryFilter || typeFilter || availabilityFilter || tireSizeWidth || tireSizeRatio

  useEffect(() => {
    fetchStation()
    // Check if already logged in
    const savedSession = localStorage.getItem(`wheel_manager_${stationId}`)
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession)
        setIsManager(true)
        setCurrentManager(session.manager)
        setSessionPassword(session.password || '')
      } catch {
        // Old format or invalid, clear it
        localStorage.removeItem(`wheel_manager_${stationId}`)
      }
    }
  }, [stationId])

  // Scroll to wheel when hash is in URL (from search results)
  useEffect(() => {
    if (!loading && station && typeof window !== 'undefined') {
      const hash = window.location.hash
      if (hash && hash.startsWith('#wheel-')) {
        setTimeout(() => {
          const element = document.getElementById(hash.slice(1))
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            // Highlight the wheel briefly
            element.style.boxShadow = '0 0 0 4px #f59e0b'
            setTimeout(() => {
              element.style.boxShadow = ''
            }, 2000)
          }
        }, 300)
      }
    }
  }, [loading, station])

  // Contacts management
  const [showContactsModal, setShowContactsModal] = useState(false) // For viewing contacts (public)
  const [contacts, setContacts] = useState<Manager[]>([])

  // Edit station details
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false)
  const [editAddress, setEditAddress] = useState('')
  const [editDepositAmount, setEditDepositAmount] = useState('')
  const [editPaymentMethods, setEditPaymentMethods] = useState<PaymentMethods>({
    cash: true,
    id_deposit: true,
    license_deposit: true
  })

  // Excel import/export
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [showExcelModal, setShowExcelModal] = useState(false)

  // Tracking tab
  const [activeTab, setActiveTab] = useState<PageTab>('wheels')
  const [borrows, setBorrows] = useState<BorrowRecord[]>([])
  const [borrowStats, setBorrowStats] = useState({ pending: 0, totalBorrowed: 0, totalReturned: 0, waitingSignature: 0, signed: 0 })
  const [borrowsLoading, setBorrowsLoading] = useState(false)
  const [borrowFilter, setBorrowFilter] = useState<'all' | 'pending' | 'borrowed' | 'returned'>('all')
  const [approvalLoading, setApprovalLoading] = useState<string | null>(null)

  // Push notifications
  const [pushSupported, setPushSupported] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [enablingPush, setEnablingPush] = useState(false)

  const fetchBorrows = async () => {
    setBorrowsLoading(true)
    try {
      const status = borrowFilter === 'all' ? '' : borrowFilter
      const response = await fetch(`/api/wheel-stations/${stationId}/borrows${status ? `?status=${status}` : ''}`)
      if (!response.ok) throw new Error('Failed to fetch borrows')
      const data = await response.json()
      setBorrows(data.borrows || [])
      setBorrowStats(data.stats || { pending: 0, totalBorrowed: 0, totalReturned: 0, waitingSignature: 0, signed: 0 })
    } catch (err) {
      console.error('Error fetching borrows:', err)
    } finally {
      setBorrowsLoading(false)
    }
  }

  // Fetch borrows when tab changes or filter changes
  useEffect(() => {
    if (activeTab === 'tracking' && isManager) {
      fetchBorrows()
    }
  }, [activeTab, borrowFilter, isManager])

  // Check push notification support and status
  useEffect(() => {
    if (isManager && currentManager) {
      const checkPush = async () => {
        const supported = isPushSupported()
        setPushSupported(supported)

        if (supported) {
          // Check if already subscribed
          try {
            const response = await fetch(`/api/wheel-stations/${stationId}/push/subscribe?manager_phone=${encodeURIComponent(currentManager.phone)}`)
            const data = await response.json()
            setPushEnabled(data.subscribed)
          } catch (err) {
            console.error('Error checking push status:', err)
          }
        }
      }
      checkPush()
    }
  }, [isManager, currentManager, stationId])

  // Toggle push notifications
  const handleTogglePush = async () => {
    if (!currentManager) return
    setEnablingPush(true)

    try {
      if (pushEnabled) {
        // Unsubscribe
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()

        if (subscription) {
          await fetch(`/api/wheel-stations/${stationId}/push/subscribe`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint: subscription.endpoint,
              manager_phone: currentManager.phone,
              manager_password: sessionPassword
            })
          })
          await subscription.unsubscribe()
        }

        setPushEnabled(false)
        toast.success('התראות כובו')
      } else {
        // Subscribe
        const notSupported = getPushNotSupportedReason()
        if (notSupported) {
          toast.error(notSupported, { duration: 5000 })
          setEnablingPush(false)
          return
        }

        const granted = await requestNotificationPermission()
        if (!granted) {
          if (Notification?.permission === 'denied') {
            toast.error('התראות חסומות בדפדפן - יש לאפשר בהגדרות', { duration: 5000 })
          } else {
            toast.error('נדרשת הרשאה כדי להפעיל התראות', { duration: 5000 })
          }
          setEnablingPush(false)
          return
        }

        const registration = await registerServiceWorker()
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

        if (!vapidPublicKey) {
          toast.error('התראות לא מוגדרות במערכת')
          setEnablingPush(false)
          return
        }

        // Convert VAPID key
        const urlBase64ToUint8Array = (base64String: string) => {
          const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
          const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
          const rawData = window.atob(base64)
          const outputArray = new Uint8Array(rawData.length)
          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i)
          }
          return outputArray
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        })

        // Save to server
        const response = await fetch(`/api/wheel-stations/${stationId}/push/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: subscription.toJSON(),
            manager_phone: currentManager.phone,
            manager_password: sessionPassword,
            userAgent: navigator.userAgent
          })
        })

        if (!response.ok) {
          throw new Error('Failed to save subscription')
        }

        setPushEnabled(true)
        toast.success('התראות הופעלו! תקבל התראה בכל בקשה חדשה')
      }
    } catch (error) {
      console.error('Error toggling push:', error)
      toast.error('שגיאה בהפעלת התראות')
    } finally {
      setEnablingPush(false)
    }
  }

  // Approve or reject pending borrow request
  const handleBorrowAction = async (borrowId: string, action: 'approve' | 'reject') => {
    if (!currentManager) return
    setApprovalLoading(borrowId)
    try {
      const response = await fetch(`/api/wheel-stations/${stationId}/borrows/${borrowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manager_phone: currentManager.phone,
          manager_password: sessionPassword,
          action
        })
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'שגיאה בביצוע הפעולה')
        return
      }
      toast.success(action === 'approve' ? 'הבקשה אושרה!' : 'הבקשה נדחתה')
      fetchBorrows()
      fetchStation() // Refresh wheel availability
    } catch {
      toast.error('שגיאה בביצוע הפעולה')
    } finally {
      setApprovalLoading(null)
    }
  }

  // Generate WhatsApp link for sign form
  const generateWhatsAppLink = (borrowerName: string, borrowerPhone: string) => {
    const signFormUrl = `${window.location.origin}/wheels/sign/${stationId}`
    const message = `שלום ${borrowerName}! 👋

קיבלת גלגל חילוף מתחנת ${station?.name || 'ידידים'}.

📝 נא למלא ולחתום על טופס ההתחייבות:
${signFormUrl}

🔄 יש להחזיר את הגלגל תוך 72 שעות לתחנה.

תודה רבה! 🙏
ידידים - סיוע בדרכים`

    const cleanPhone = borrowerPhone.replace(/\D/g, '')
    const israelPhone = cleanPhone.startsWith('0') ? '972' + cleanPhone.slice(1) : cleanPhone
    return `https://wa.me/${israelPhone}?text=${encodeURIComponent(message)}`
  }

  const fetchStation = async () => {
    try {
      const response = await fetch(`/api/wheel-stations/${stationId}`)
      if (!response.ok) throw new Error('Failed to fetch station')
      const data = await response.json()
      setStation(data.station)
      setContacts(data.station.wheel_station_managers || [])
    } catch (err) {
      setError('שגיאה בטעינת התחנה')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Manager login - verify phone + password via API
  const handleLogin = async () => {
    if (!loginPhone || !loginPassword) {
      setLoginError('נא להזין טלפון וסיסמא')
      return
    }
    setActionLoading(true)
    try {
      const response = await fetch(`/api/wheel-stations/${stationId}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginPhone, password: loginPassword })
      })
      const data = await response.json()
      if (!response.ok) {
        setLoginError(data.error || 'שגיאה בכניסה')
        return
      }
      setIsManager(true)
      setCurrentManager(data.manager)
      setSessionPassword(loginPassword)
      localStorage.setItem(`wheel_manager_${stationId}`, JSON.stringify({
        manager: data.manager,
        password: loginPassword,
        token: data.token
      }))
      setShowLoginModal(false)
      setLoginError('')
      setLoginPhone('')
      setLoginPassword('')
    } catch {
      setLoginError('שגיאה בכניסה')
    } finally {
      setActionLoading(false)
    }
  }

  const handleLogout = () => {
    setIsManager(false)
    setCurrentManager(null)
    setSessionPassword('')
    localStorage.removeItem(`wheel_manager_${stationId}`)
  }

  // Change password
  const handleChangePassword = async () => {
    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
      toast.error('נא למלא את כל השדות')
      return
    }
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error('הסיסמאות החדשות לא תואמות')
      return
    }
    if (passwordForm.new.length < 4) {
      toast.error('הסיסמא חייבת להכיל לפחות 4 תווים')
      return
    }
    setActionLoading(true)
    try {
      const response = await fetch(`/api/wheel-stations/${stationId}/auth`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: currentManager?.phone,
          current_password: passwordForm.current,
          new_password: passwordForm.new
        })
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'שגיאה בשינוי סיסמא')
        return
      }
      toast.success('הסיסמא שונתה בהצלחה!')
      setShowChangePasswordModal(false)
      setPasswordForm({ current: '', new: '', confirm: '' })
    } catch {
      toast.error('שגיאה בשינוי סיסמא')
    } finally {
      setActionLoading(false)
    }
  }

  // Return wheel
  const handleReturn = async (wheel: Wheel) => {
    const borrowInfo = wheel.current_borrow
    const depositInfo = borrowInfo?.deposit_type && borrowInfo.deposit_type !== 'none'
      ? `\n\n⚠️ תזכורת: יש להחזיר פיקדון!\nסוג: ${borrowInfo.deposit_type === 'cash' ? 'מזומן' : borrowInfo.deposit_type === 'credit_card' ? 'כרטיס אשראי' : borrowInfo.deposit_type === 'id' ? 'תעודת זהות' : borrowInfo.deposit_type}${borrowInfo.deposit_details ? `\nפרטים: ${borrowInfo.deposit_details}` : ''}`
      : ''

    showConfirm({
      title: '📥 החזרת גלגל',
      message: `להחזיר את גלגל #${wheel.wheel_number}?${depositInfo}`,
      confirmText: 'החזר',
      variant: 'info',
      onConfirm: async () => {
        closeConfirmDialog()
        setActionLoading(true)
        try {
          const response = await fetch(`/api/wheel-stations/${stationId}/wheels/${wheel.id}/borrow`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              manager_phone: currentManager?.phone,
              manager_password: sessionPassword
            })
          })
          if (!response.ok) throw new Error('Failed to return')
          await fetchStation()
          toast.success('הגלגל הוחזר בהצלחה!')
        } catch {
          toast.error('שגיאה בהחזרה')
        } finally {
          setActionLoading(false)
        }
      }
    })
  }

  // Add wheel
  const handleAddWheel = async () => {
    // Validate required fields and highlight missing ones
    const errors: string[] = []
    if (!wheelForm.wheel_number) errors.push('wheel_number')
    if (!wheelForm.rim_size) errors.push('rim_size')
    if (!wheelForm.bolt_spacing) errors.push('bolt_spacing')

    if (errors.length > 0) {
      setWheelFormErrors(errors)
      return
    }
    setWheelFormErrors([])
    setActionLoading(true)
    try {
      const response = await fetch(`/api/wheel-stations/${stationId}/wheels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wheel_number: wheelForm.wheel_number,
          rim_size: wheelForm.rim_size,
          bolt_count: parseInt(wheelForm.bolt_count),
          bolt_spacing: parseFloat(wheelForm.bolt_spacing),
          category: wheelForm.category || null,
          is_donut: wheelForm.is_donut,
          notes: wheelForm.notes || null,
          manager_phone: currentManager?.phone,
          manager_password: sessionPassword
        })
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add')
      }
      await fetchStation()
      setShowAddWheelModal(false)
      setShowCustomCategory(false)
      setWheelForm({
        wheel_number: '',
        rim_size: '',
        bolt_count: '4',
        bolt_spacing: '',
        category: '',
        is_donut: false,
        notes: ''
      })
      toast.success('הגלגל נוסף בהצלחה!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בהוספה')
    } finally {
      setActionLoading(false)
    }
  }

  // Delete wheel
  const handleDeleteWheel = async (wheel: Wheel) => {
    showConfirm({
      title: '🗑️ מחיקת גלגל',
      message: `למחוק את גלגל #${wheel.wheel_number}? פעולה זו אינה ניתנת לביטול`,
      confirmText: 'מחק',
      variant: 'danger',
      onConfirm: async () => {
        closeConfirmDialog()
        setActionLoading(true)
        try {
          const response = await fetch(`/api/wheel-stations/${stationId}/wheels/${wheel.id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              manager_phone: currentManager?.phone,
              manager_password: sessionPassword
            })
          })
          if (!response.ok) throw new Error('Failed to delete')
          await fetchStation()
          toast.success('הגלגל נמחק!')
        } catch {
          toast.error('שגיאה במחיקה')
        } finally {
          setActionLoading(false)
        }
      }
    })
  }

  // Save contacts
  const handleSaveContacts = async () => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/wheel-stations/${stationId}/managers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          managers: contacts,
          manager_phone: currentManager?.phone,
          manager_password: sessionPassword
        })
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save')
      }
      await fetchStation()
      setShowContactsModal(false)
      toast.success('אנשי הקשר עודכנו!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בשמירה')
    } finally {
      setActionLoading(false)
    }
  }

  // Excel upload handler
  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Clear the input so the same file can be selected again
    event.target.value = ''

    setUploadLoading(true)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: 'binary' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)

          if (jsonData.length === 0) {
            toast.error('הקובץ ריק או לא תקין')
            setUploadLoading(false)
            return
          }

          // Send to import API
          const response = await fetch(`/api/wheel-stations/${stationId}/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              wheels: jsonData,
              manager_phone: currentManager?.phone,
              manager_password: sessionPassword
            })
          })

          const result = await response.json()

          if (!response.ok) {
            toast.error(result.error || 'שגיאה בייבוא')
            return
          }

          await fetchStation()
          toast.success(`נוספו ${result.imported} גלגלים בהצלחה!`)
          if (result.errors && result.errors.length > 0) {
            toast.error(`${result.errors.length} שורות נכשלו`)
          }
        } catch (err) {
          console.error('Excel parse error:', err)
          toast.error('שגיאה בקריאת הקובץ')
        } finally {
          setUploadLoading(false)
        }
      }
      reader.readAsBinaryString(file)
    } catch {
      toast.error('שגיאה בטעינת הקובץ')
      setUploadLoading(false)
    }
  }

  // Excel export handler
  const handleExportExcel = (exportType: 'inventory' | 'history' | 'all') => {
    const wb = XLSX.utils.book_new()
    const date = new Date().toISOString().split('T')[0]

    if (exportType === 'inventory' || exportType === 'all') {
      if (!station || !station.wheels.length) {
        if (exportType === 'inventory') {
          toast.error('אין גלגלים לייצוא')
          return
        }
      } else {
        // Prepare inventory data with Hebrew headers
        const inventoryData = station.wheels.map(wheel => ({
          'מספר גלגל': wheel.wheel_number,
          'גודל ג\'אנט': wheel.rim_size,
          'כמות ברגים': wheel.bolt_count,
          'מרווח ברגים': wheel.bolt_spacing,
          'קטגוריה': wheel.category || '',
          'דונאט': wheel.is_donut ? 'כן' : 'לא',
          'הערות': wheel.notes || '',
          'זמין': wheel.is_available ? 'כן' : 'לא',
          'שם שואל': wheel.current_borrow?.borrower_name || '',
          'טלפון שואל': wheel.current_borrow?.borrower_phone || '',
        }))

        const wsInventory = XLSX.utils.json_to_sheet(inventoryData)
        wsInventory['!cols'] = [
          { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 25 },
          { wch: 8 }, { wch: 25 }, { wch: 8 }, { wch: 20 }, { wch: 15 },
        ]
        XLSX.utils.book_append_sheet(wb, wsInventory, 'מלאי גלגלים')
      }
    }

    if (exportType === 'history' || exportType === 'all') {
      if (!borrows.length) {
        if (exportType === 'history') {
          toast.error('אין היסטוריה לייצוא')
          return
        }
      } else {
        // Prepare history data
        const historyData = borrows.map(borrow => ({
          'שם פונה': borrow.borrower_name,
          'טלפון': borrow.borrower_phone,
          'ת.ז.': borrow.borrower_id_number || '',
          'כתובת': borrow.borrower_address || '',
          'דגם רכב': borrow.vehicle_model || '',
          'מספר גלגל': borrow.wheels?.wheel_number || '',
          'תאריך השאלה': borrow.borrow_date ? new Date(borrow.borrow_date).toLocaleDateString('he-IL') : '',
          'תאריך החזרה': borrow.actual_return_date ? new Date(borrow.actual_return_date).toLocaleDateString('he-IL') : '',
          'סוג פיקדון': borrow.deposit_type === 'cash' ? `₪${station.deposit_amount || 200} מזומן` :
                        borrow.deposit_type === 'bit' ? `₪${station.deposit_amount || 200} ביט` :
                        borrow.deposit_type === 'paybox' ? `₪${station.deposit_amount || 200} פייבוקס` :
                        borrow.deposit_type === 'bank_transfer' ? `₪${station.deposit_amount || 200} העברה` :
                        borrow.deposit_type === 'id' ? 'ת.ז.' :
                        borrow.deposit_type === 'license' ? 'רישיון' : '',
          'סטטוס': borrow.status === 'pending' ? 'ממתין' :
                   borrow.status === 'borrowed' ? 'מושאל' :
                   borrow.status === 'returned' ? 'הוחזר' :
                   borrow.status === 'rejected' ? 'נדחה' : borrow.status,
          'חתום': borrow.is_signed ? 'כן' : 'לא',
          'הערות': borrow.notes || '',
        }))

        const wsHistory = XLSX.utils.json_to_sheet(historyData)
        wsHistory['!cols'] = [
          { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 20 },
          { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 15 }, { wch: 10 },
          { wch: 8 }, { wch: 25 },
        ]
        XLSX.utils.book_append_sheet(wb, wsHistory, 'היסטוריית השאלות')
      }
    }

    // Generate filename
    const typeLabel = exportType === 'inventory' ? 'inventory' : exportType === 'history' ? 'history' : 'full'
    const filename = `wheels_${station?.name.replace(/\s/g, '_') || 'station'}_${typeLabel}_${date}.xlsx`

    XLSX.writeFile(wb, filename)
    toast.success('הקובץ הורד בהצלחה!')
    setShowExcelModal(false)
  }

  const addContact = () => {
    if (contacts.length >= 4) {
      toast.error('ניתן להוסיף עד 4 אנשי קשר')
      return
    }
    setContacts([...contacts, { id: '', full_name: '', phone: '', role: 'מנהל תחנה', is_primary: false }])
  }

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index))
  }

  const updateContact = (index: number, field: string, value: string | boolean) => {
    const updated = [...contacts]
    updated[index] = { ...updated[index], [field]: value }
    setContacts(updated)
  }

  // Custom confirm dialog helper
  const showConfirm = (options: {
    title: string
    message: string
    onConfirm: () => void
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'warning' | 'info'
  }) => {
    setConfirmDialogData(options)
    setShowConfirmDialog(true)
  }

  const closeConfirmDialog = () => {
    setShowConfirmDialog(false)
    setConfirmDialogData(null)
  }

  const filteredWheels = station?.wheels.filter(wheel => {
    if (rimSizeFilter && wheel.rim_size !== rimSizeFilter) return false
    if (boltCountFilter && wheel.bolt_count.toString() !== boltCountFilter) return false
    if (boltSpacingFilter && wheel.bolt_spacing.toString() !== boltSpacingFilter) return false
    if (categoryFilter && wheel.category !== categoryFilter) return false
    if (typeFilter === 'donut' && !wheel.is_donut) return false
    if (typeFilter === 'full' && wheel.is_donut) return false
    if (availabilityFilter === 'available' && !wheel.is_available) return false
    if (availabilityFilter === 'taken' && wheel.is_available) return false
    // Tire size search - only for non-donut wheels
    if ((tireSizeWidth || tireSizeRatio) && !wheel.is_donut) {
      const searchText = `${wheel.wheel_number} ${wheel.notes || ''}`.toLowerCase()
      if (tireSizeWidth && !searchText.includes(tireSizeWidth)) return false
      if (tireSizeRatio && !searchText.includes(tireSizeRatio)) return false
    }
    return true
  }) || []

  // Get unique values for filters
  const rimSizes = [...new Set(station?.wheels.map(w => w.rim_size))].sort()
  const boltCounts = [...new Set(station?.wheels.map(w => w.bolt_count.toString()))].sort()
  const boltSpacings = [...new Set(station?.wheels.map(w => w.bolt_spacing.toString()))].sort()
  const categories = [...new Set(station?.wheels.map(w => w.category).filter(Boolean))]

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>טוען מלאי גלגלים...</p>
        </div>
      </div>
    )
  }

  if (error || !station) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <p>❌ {error || 'תחנה לא נמצאה'}</p>
          <Link href="/wheels" style={styles.backLink}>← חזרה לרשימת התחנות</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <style>{`
        @media (max-width: 600px) {
          .station-header-title {
            font-size: 1.4rem !important;
          }
          .station-header-top {
            flex-wrap: wrap;
            gap: 8px;
          }
          .station-manager-actions {
            flex-wrap: wrap;
            gap: 6px !important;
            justify-content: flex-end;
          }
          .station-manager-btn {
            padding: 6px 10px !important;
            font-size: 0.75rem !important;
          }
          .station-manager-btn .btn-text {
            display: none;
          }
          .station-login-btn {
            padding: 8px 14px !important;
            font-size: 0.85rem !important;
          }
          .station-filter-row {
            flex-direction: column;
            gap: 8px !important;
          }
          .station-filter-group {
            min-width: 100% !important;
          }
          .station-card-actions {
            flex-direction: column;
            gap: 6px !important;
          }
          .station-card-actions button {
            width: 100% !important;
          }
          .station-grid {
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)) !important;
            gap: 10px !important;
          }
          .station-stats {
            flex-wrap: wrap;
            justify-content: center;
          }
          .station-stat {
            min-width: 80px !important;
            padding: 12px 15px !important;
          }
          .station-contact-buttons {
            flex-direction: column;
            gap: 8px !important;
          }
          .station-contact-btn {
            width: 100% !important;
            justify-content: center !important;
          }
          /* Responsive table - convert to cards on mobile */
          .tracking-table-container table {
            display: none !important;
          }
          .tracking-table-container .mobile-cards {
            display: flex !important;
          }
          .tracking-filter-tabs {
            flex-wrap: wrap !important;
            gap: 6px !important;
          }
          .tracking-filter-btn {
            padding: 8px 12px !important;
            font-size: 0.8rem !important;
          }
          .tracking-stats {
            flex-wrap: wrap !important;
            gap: 10px !important;
          }
          .tracking-stat {
            flex: 1 !important;
            min-width: 90px !important;
            padding: 12px !important;
          }
          .tracking-stat-value {
            font-size: 1.3rem !important;
          }
        }
        @media (min-width: 601px) {
          .tracking-table-container .mobile-cards {
            display: none !important;
          }
        }
      `}</style>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #334155',
            direction: 'rtl',
            padding: '16px',
            borderRadius: '12px',
            fontSize: '0.95rem',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <header style={styles.header}>
        <div style={styles.headerTop} className="station-header-top">
          <Link href="/wheels" style={styles.backBtn}>← חזרה</Link>
          {isManager ? (
            <div style={styles.managerActions} className="station-manager-actions">
              <button style={styles.addBtn} className="station-manager-btn" onClick={() => setShowAddWheelModal(true)}>➕ <span className="btn-text">הוסף גלגל</span></button>
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleExcelUpload}
              />
              <button
                style={styles.excelBtn}
                className="station-manager-btn"
                onClick={() => setShowExcelModal(true)}
              >
                📊 <span className="btn-text">Excel</span>
              </button>
              <button style={styles.editContactsBtn} className="station-manager-btn" onClick={() => { setEditAddress(station.address || ''); setEditDepositAmount(String(station.deposit_amount || 200)); setEditPaymentMethods(station.payment_methods || { cash: true, id_deposit: true, license_deposit: true }); setShowEditDetailsModal(true) }}>⚙️ <span className="btn-text">ערוך פרטים</span></button>
              <button style={styles.logoutBtn} className="station-manager-btn" onClick={handleLogout}>🚪 <span className="btn-text">יציאה</span></button>
            </div>
          ) : (
            <button style={styles.managerBtn} className="station-login-btn" onClick={() => setShowLoginModal(true)}>🔐 כניסת מנהל</button>
          )}
        </div>
        <h1 style={styles.title} className="station-header-title">🏙️ {station.name}</h1>
        {station.address && <p style={styles.address}>📍 {station.address}</p>}
        {isManager && <div style={styles.managerBadge}>🔓 מצב ניהול</div>}
      </header>

      {/* Stats */}
      <div style={styles.stats} className="station-stats">
        <div style={styles.stat} className="station-stat">
          <div style={styles.statValue}>{station.totalWheels}</div>
          <div style={styles.statLabel}>סה"כ גלגלים</div>
        </div>
        <div style={{...styles.stat, ...styles.statAvailable}} className="station-stat">
          <div style={{...styles.statValue, color: '#10b981'}}>{station.availableWheels}</div>
          <div style={styles.statLabel}>זמינים</div>
        </div>
        <div style={{...styles.stat, ...styles.statTaken}} className="station-stat">
          <div style={{...styles.statValue, color: '#ef4444'}}>{station.totalWheels - station.availableWheels}</div>
          <div style={styles.statLabel}>מושאלים</div>
        </div>
      </div>

      {/* Tab Navigation - only show tracking tab for managers */}
      {isManager && (
        <div style={styles.tabNav}>
          <button
            style={{...styles.tabBtn, ...(activeTab === 'wheels' ? styles.tabBtnActive : {})}}
            onClick={() => setActiveTab('wheels')}
          >
            🛞 מלאי גלגלים
          </button>
          <button
            style={{...styles.tabBtn, ...(activeTab === 'tracking' ? styles.tabBtnActive : {})}}
            onClick={() => setActiveTab('tracking')}
          >
            📊 מעקב השאלות
          </button>
        </div>
      )}

      {/* Tracking Tab Content */}
      {activeTab === 'tracking' && isManager && (
        <div style={styles.trackingSection}>
          {/* Tracking Stats */}
          <div style={styles.trackingStats} className="tracking-stats">
            <div style={styles.trackingStat} className="tracking-stat">
              <div style={{...styles.trackingStatValue, color: '#ec4899'}} className="tracking-stat-value">{borrowStats.pending}</div>
              <div style={styles.trackingStatLabel}>ממתינים לאישור</div>
            </div>
            <div style={styles.trackingStat} className="tracking-stat">
              <div style={{...styles.trackingStatValue, color: '#10b981'}} className="tracking-stat-value">{borrowStats.totalBorrowed}</div>
              <div style={styles.trackingStatLabel}>מושאלים</div>
            </div>
            <div style={styles.trackingStat} className="tracking-stat">
              <div style={{...styles.trackingStatValue, color: '#8b5cf6'}} className="tracking-stat-value">{borrowStats.totalReturned}</div>
              <div style={styles.trackingStatLabel}>הוחזרו</div>
            </div>
          </div>

          {/* Filter tabs */}
          <div style={styles.trackingFilterTabs} className="tracking-filter-tabs">
            <button
              style={{...styles.trackingFilterBtn, ...(borrowFilter === 'all' ? styles.trackingFilterBtnActive : {})}}
              className="tracking-filter-btn"
              onClick={() => setBorrowFilter('all')}
            >
              הכל
            </button>
            <button
              style={{...styles.trackingFilterBtn, ...(borrowFilter === 'pending' ? styles.trackingFilterBtnActive : {}), ...(borrowStats.pending > 0 ? styles.trackingFilterBtnPending : {})}}
              className="tracking-filter-btn"
              onClick={() => setBorrowFilter('pending')}
            >
              ממתינים ({borrowStats.pending})
            </button>
            <button
              style={{...styles.trackingFilterBtn, ...(borrowFilter === 'borrowed' ? styles.trackingFilterBtnActive : {})}}
              className="tracking-filter-btn"
              onClick={() => setBorrowFilter('borrowed')}
            >
              מושאלים
            </button>
            <button
              style={{...styles.trackingFilterBtn, ...(borrowFilter === 'returned' ? styles.trackingFilterBtnActive : {})}}
              className="tracking-filter-btn"
              onClick={() => setBorrowFilter('returned')}
            >
              הוחזרו
            </button>
          </div>

          {/* Borrows Table */}
          {borrowsLoading ? (
            <div style={styles.loading}>טוען...</div>
          ) : (
            <div style={styles.trackingTableWrapper} className="tracking-table-container">
              {/* Desktop Table */}
              <table style={styles.trackingTable}>
                <thead>
                  <tr>
                    <th style={styles.trackingTh}>פונה</th>
                    <th style={styles.trackingTh}>גלגל</th>
                    <th style={styles.trackingTh}>פיקדון</th>
                    <th style={styles.trackingTh}>סטטוס</th>
                    <th style={styles.trackingTh}>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {borrows.map(borrow => {
                    const isOverdue = borrow.status === 'borrowed' && !borrow.is_signed &&
                      borrow.created_at && (Date.now() - new Date(borrow.created_at).getTime() > 24 * 60 * 60 * 1000)
                    return (
                      <tr key={borrow.id}>
                        <td style={styles.trackingTd}>
                          <div style={styles.borrowerNameCell}>{borrow.borrower_name}</div>
                          <div style={styles.borrowerInfoCell}>{borrow.borrower_phone}</div>
                          <div style={styles.borrowerInfoCell}>
                            {new Date(borrow.borrow_date || borrow.created_at).toLocaleDateString('he-IL')}
                          </div>
                        </td>
                        <td style={styles.trackingTd}>
                          <div>{borrow.wheels?.wheel_number || '-'}</div>
                          {borrow.vehicle_model && (
                            <div style={styles.borrowerInfoCell}>{borrow.vehicle_model}</div>
                          )}
                        </td>
                        <td style={styles.trackingTd}>
                          <span style={{
                            ...styles.depositBadge,
                            ...(borrow.deposit_type === 'cash' || borrow.deposit_type === 'bit' ? styles.depositBadgeMoney :
                                borrow.deposit_type === 'id' || borrow.deposit_type === 'license' ? styles.depositBadgeDoc : {})
                          }}>
                            {borrow.deposit_type === 'cash' ? `₪${station.deposit_amount || 200} מזומן` :
                             borrow.deposit_type === 'bit' ? `₪${station.deposit_amount || 200} ביט` :
                             borrow.deposit_type === 'paybox' ? `₪${station.deposit_amount || 200} פייבוקס` :
                             borrow.deposit_type === 'bank_transfer' ? `₪${station.deposit_amount || 200} העברה` :
                             borrow.deposit_type === 'id' ? 'ת.ז.' :
                             borrow.deposit_type === 'license' ? 'רישיון' : '-'}
                          </span>
                        </td>
                        <td style={styles.trackingTd}>
                          {borrow.status === 'pending' ? (
                            <span style={styles.statusPending}>🔔 ממתין לאישור</span>
                          ) : borrow.status === 'returned' ? (
                            <span style={styles.statusReturned}>🔙 הוחזר</span>
                          ) : borrow.status === 'rejected' ? (
                            <span style={styles.statusOverdue}>❌ נדחה</span>
                          ) : borrow.is_signed ? (
                            <span style={styles.statusSigned}>✅ מושאל (חתום)</span>
                          ) : isOverdue ? (
                            <span style={styles.statusOverdue}>⚠️ מושאל (לא חתום)</span>
                          ) : (
                            <span style={styles.statusWaiting}>📝 מושאל</span>
                          )}
                        </td>
                        <td style={styles.trackingTd}>
                          {borrow.status === 'pending' && (
                            <div style={styles.actionButtons}>
                              <button
                                style={styles.approveBtn}
                                onClick={() => handleBorrowAction(borrow.id, 'approve')}
                                disabled={approvalLoading === borrow.id}
                              >
                                {approvalLoading === borrow.id ? '...' : '✅ אשר'}
                              </button>
                              <button
                                style={styles.rejectBtn}
                                onClick={() => handleBorrowAction(borrow.id, 'reject')}
                                disabled={approvalLoading === borrow.id}
                              >
                                ❌
                              </button>
                            </div>
                          )}
                          {borrow.status === 'borrowed' && !borrow.is_signed && (
                            <a
                              href={generateWhatsAppLink(borrow.borrower_name, borrow.borrower_phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={styles.whatsappBtn}
                            >
                              📱 שלח טופס
                            </a>
                          )}
                          {borrow.status === 'borrowed' && (
                            <button
                              style={styles.returnBtnSmall}
                              onClick={() => {
                                const wheel = station?.wheels.find(w => w.id === borrow.wheel_id)
                                if (wheel) handleReturn(wheel)
                              }}
                            >
                              🔙 החזר
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {borrows.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{padding: '40px'}}>
                        <div style={styles.emptyState}>
                          <div style={styles.emptyIcon}>📋</div>
                          <div style={styles.emptyTitle}>אין רשומות להצגה</div>
                          <div style={styles.emptyText}>כשתהיינה השאלות או החזרות, הן יופיעו כאן</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Mobile Cards */}
              <div className="mobile-cards" style={{display: 'none', flexDirection: 'column', gap: '12px'}}>
                {borrows.length === 0 ? (
                  <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>📋</div>
                    <div style={styles.emptyTitle}>אין רשומות להצגה</div>
                    <div style={styles.emptyText}>כשתהיינה השאלות או החזרות, הן יופיעו כאן</div>
                  </div>
                ) : borrows.map(borrow => {
                  const isOverdue = borrow.status === 'borrowed' && !borrow.is_signed &&
                    borrow.created_at && (Date.now() - new Date(borrow.created_at).getTime() > 24 * 60 * 60 * 1000)
                  const isExpanded = expandedCards.has(borrow.id)
                  const toggleCard = () => {
                    setExpandedCards(prev => {
                      const next = new Set(prev)
                      if (next.has(borrow.id)) {
                        next.delete(borrow.id)
                      } else {
                        next.add(borrow.id)
                      }
                      return next
                    })
                  }
                  return (
                    <div key={borrow.id} style={styles.mobileCard}>
                      <div
                        style={{...styles.mobileCardHeader, cursor: 'pointer'}}
                        onClick={toggleCard}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>{isExpanded ? '▼' : '◀'}</span>
                          <div>
                            <div style={styles.borrowerNameCell}>{borrow.borrower_name}</div>
                            {isExpanded && <div style={styles.borrowerInfoCell}>{borrow.borrower_phone}</div>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {!isExpanded && <span style={{color: '#9ca3af', fontSize: '12px'}}>{borrow.wheels?.wheel_number || '-'}</span>}
                          {borrow.status === 'pending' ? (
                            <span style={styles.statusPending}>🔔 ממתין</span>
                          ) : borrow.status === 'returned' ? (
                            <span style={styles.statusReturned}>🔙 הוחזר</span>
                          ) : borrow.status === 'rejected' ? (
                            <span style={styles.statusOverdue}>❌ נדחה</span>
                          ) : borrow.is_signed ? (
                            <span style={styles.statusSigned}>✅ חתום</span>
                          ) : isOverdue ? (
                            <span style={styles.statusOverdue}>⚠️ לא חתום</span>
                          ) : (
                            <span style={styles.statusWaiting}>📝 מושאל</span>
                          )}
                        </div>
                      </div>
                      {isExpanded && (
                        <>
                          <div style={styles.mobileCardBody}>
                            <div style={styles.mobileCardRow}>
                              <span style={{color: '#9ca3af'}}>גלגל:</span>
                              <span>{borrow.wheels?.wheel_number || '-'}</span>
                            </div>
                            <div style={styles.mobileCardRow}>
                              <span style={{color: '#9ca3af'}}>תאריך:</span>
                              <span>{new Date(borrow.borrow_date || borrow.created_at).toLocaleDateString('he-IL')}</span>
                            </div>
                            <div style={styles.mobileCardRow}>
                              <span style={{color: '#9ca3af'}}>פיקדון:</span>
                              <span style={{
                                ...styles.depositBadge,
                                ...(borrow.deposit_type === 'cash' || borrow.deposit_type === 'bit' ? styles.depositBadgeMoney :
                                    borrow.deposit_type === 'id' || borrow.deposit_type === 'license' ? styles.depositBadgeDoc : {})
                              }}>
                                {borrow.deposit_type === 'cash' ? `₪${station.deposit_amount || 200} מזומן` :
                                 borrow.deposit_type === 'bit' ? `₪${station.deposit_amount || 200} ביט` :
                                 borrow.deposit_type === 'paybox' ? `₪${station.deposit_amount || 200} פייבוקס` :
                                 borrow.deposit_type === 'bank_transfer' ? `₪${station.deposit_amount || 200} העברה` :
                                 borrow.deposit_type === 'id' ? 'ת.ז.' :
                                 borrow.deposit_type === 'license' ? 'רישיון' : '-'}
                              </span>
                            </div>
                            {borrow.vehicle_model && (
                              <div style={styles.mobileCardRow}>
                                <span style={{color: '#9ca3af'}}>רכב:</span>
                                <span>{borrow.vehicle_model}</span>
                              </div>
                            )}
                          </div>
                          <div style={styles.mobileCardActions}>
                            {borrow.status === 'pending' && (
                              <>
                                <button
                                  style={{...styles.approveBtn, flex: 1}}
                                  onClick={(e) => { e.stopPropagation(); handleBorrowAction(borrow.id, 'approve') }}
                                  disabled={approvalLoading === borrow.id}
                                >
                                  {approvalLoading === borrow.id ? '...' : '✅ אשר'}
                                </button>
                                <button
                                  style={styles.rejectBtn}
                                  onClick={(e) => { e.stopPropagation(); handleBorrowAction(borrow.id, 'reject') }}
                                  disabled={approvalLoading === borrow.id}
                                >
                                  ❌
                                </button>
                              </>
                            )}
                            {borrow.status === 'borrowed' && !borrow.is_signed && (
                              <a
                                href={generateWhatsAppLink(borrow.borrower_name, borrow.borrower_phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{...styles.whatsappBtn, flex: 1, textAlign: 'center'}}
                                onClick={(e) => e.stopPropagation()}
                              >
                                📱 שלח טופס
                              </a>
                            )}
                            {borrow.status === 'borrowed' && (
                              <button
                                style={{...styles.returnBtnSmall, flex: 1}}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const wheel = station?.wheels.find(w => w.id === borrow.wheel_id)
                                  if (wheel) handleReturn(wheel)
                                }}
                              >
                                🔙 החזר
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* WhatsApp Link for new borrowers */}
          <div style={styles.whatsappLinkBox}>
            <h4 style={styles.whatsappLinkTitle}>🔗 קישור לטופס השאלת גלגל</h4>
            <p style={styles.whatsappLinkDesc}>שלח את הקישור הזה לפונים שצריכים למלא טופס השאלה:</p>
            <div style={styles.whatsappLinkInput}>
              <input
                type="text"
                readOnly
                value={typeof window !== 'undefined' ? `${window.location.origin}/wheels/sign/${stationId}` : ''}
                style={styles.linkInput}
                onClick={e => (e.target as HTMLInputElement).select()}
              />
              <button
                style={styles.copyBtn}
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/wheels/sign/${stationId}`)
                  toast.success('הקישור הועתק!')
                }}
              >
                📋 העתק
              </button>
            </div>
            <button
              style={{
                marginTop: '12px',
                padding: '10px 16px',
                background: '#25d366',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                justifyContent: 'center',
              }}
              onClick={() => {
                const signFormUrl = `${window.location.origin}/wheels/sign/${stationId}`
                const message = `שלום, להשאלת גלגל נא למלא את הטופס הבא:\n${signFormUrl}`
                window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
              }}
            >
              <span style={{fontSize: '18px'}}>📲</span> שלח ב-WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* Wheels Tab Content */}
      {activeTab === 'wheels' && (
        <>
      {/* Filters */}
      <div style={styles.filters}>
        <div style={styles.filtersHeader}>
          <h3 style={styles.filtersTitle}>🔍 סינון</h3>
          <div style={{display: 'flex', gap: '8px'}}>
            {hasActiveFilters && (
              <button
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
                onClick={clearAllFilters}
              >
                🗑️ נקה הכל
              </button>
            )}
            <button
              style={{...styles.filtersToggle, ...(showAdvancedFilters ? styles.filtersToggleActive : {})}}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              {showAdvancedFilters ? '- פחות אפשרויות' : '+ עוד אפשרויות'}
            </button>
          </div>
        </div>
        <div style={styles.filterRow} className="station-filter-row">
          <div style={styles.filterGroup} className="station-filter-group">
            <label style={styles.filterLabel}>גודל ג'אנט</label>
            <select
              style={styles.filterSelect}
              value={rimSizeFilter}
              onChange={e => setRimSizeFilter(e.target.value)}
            >
              <option value="">הכל</option>
              {rimSizes.map(size => (
                <option key={size} value={size}>{size}"</option>
              ))}
            </select>
          </div>
          <div style={styles.filterGroup} className="station-filter-group">
            <label style={styles.filterLabel}>כמות ברגים</label>
            <select
              style={styles.filterSelect}
              value={boltCountFilter}
              onChange={e => setBoltCountFilter(e.target.value)}
            >
              <option value="">הכל</option>
              {boltCounts.map(count => (
                <option key={count} value={count}>{count}</option>
              ))}
            </select>
          </div>
          <div style={styles.filterGroup} className="station-filter-group">
            <label style={styles.filterLabel}>מרווח ברגים</label>
            <select
              style={styles.filterSelect}
              value={boltSpacingFilter}
              onChange={e => setBoltSpacingFilter(e.target.value)}
            >
              <option value="">הכל</option>
              {boltSpacings.map(spacing => (
                <option key={spacing} value={spacing}>{spacing}</option>
              ))}
            </select>
          </div>
        </div>
        {showAdvancedFilters && (
          <>
            <div style={styles.filterRow} className="station-filter-row">
              <div style={styles.filterGroup} className="station-filter-group">
                <label style={styles.filterLabel}>קטגוריה</label>
                <select
                  style={styles.filterSelect}
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                >
                  <option value="">הכל</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat || ''}>{cat}</option>
                  ))}
                </select>
              </div>
              <div style={styles.filterGroup} className="station-filter-group">
                <label style={styles.filterLabel}>סוג</label>
                <select
                  style={styles.filterSelect}
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                >
                  <option value="">הכל</option>
                  <option value="full">מלא</option>
                  <option value="donut">דונאט</option>
                </select>
              </div>
              <div style={styles.filterGroup} className="station-filter-group">
                <label style={styles.filterLabel}>זמינות</label>
                <select
                  style={styles.filterSelect}
                  value={availabilityFilter}
                  onChange={e => setAvailabilityFilter(e.target.value)}
                >
                  <option value="">הכל</option>
                  <option value="available">זמין בלבד</option>
                  <option value="taken">מושאל</option>
                </select>
              </div>
            </div>
            {/* Tire Size Filter */}
            <div style={{marginTop: '12px', padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: '1px dashed #3b82f6'}}>
              <label style={{...styles.filterLabel, marginBottom: '8px', display: 'block', color: '#3b82f6'}}>
                🛞 חיפוש לפי מידת גלגל (מחפש במספר גלגל והערות)
              </label>
              <div style={{display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap'}}>
                <input
                  type="text"
                  placeholder="רוחב (205)"
                  value={tireSizeWidth}
                  onChange={e => setTireSizeWidth(e.target.value.replace(/\D/g, ''))}
                  style={{...styles.filterSelect, width: '80px', textAlign: 'center'}}
                />
                <span style={{color: '#9ca3af'}}>/</span>
                <input
                  type="text"
                  placeholder="אחוז (55)"
                  value={tireSizeRatio}
                  onChange={e => setTireSizeRatio(e.target.value.replace(/\D/g, ''))}
                  style={{...styles.filterSelect, width: '80px', textAlign: 'center'}}
                />
                <span style={{color: '#6b7280', fontSize: '0.85rem'}}>למשל: 205/55</span>
              </div>
              <p style={{fontSize: '0.75rem', color: '#9ca3af', marginTop: '6px'}}>
                מחפש גלגלים שמספר הגלגל או ההערות שלהם מכילים את המידה
              </p>
            </div>
          </>
        )}
      </div>

      {/* View Toggle */}
      <div style={styles.toolbar}>
        <div style={styles.viewToggle}>
          <button
            style={{...styles.viewBtn, ...(viewMode === 'cards' ? styles.viewBtnActive : {})}}
            onClick={() => setViewMode('cards')}
            title="תצוגת כרטיסים"
          >
            🎴
          </button>
          <button
            style={{...styles.viewBtn, ...(viewMode === 'table' ? styles.viewBtnActive : {})}}
            onClick={() => setViewMode('table')}
            title="תצוגת טבלה"
          >
            📋
          </button>
        </div>
        <div style={styles.resultsCount}>
          מציג {filteredWheels.length} מתוך {station.totalWheels} גלגלים
        </div>
      </div>

      {/* Wheels Grid (Cards View) */}
      {viewMode === 'cards' && (
        <div style={styles.grid} className="station-grid">
          {filteredWheels.length === 0 && (
            <div style={styles.emptyStateCard}>
              <div style={styles.emptyIcon}>🛞</div>
              <div style={styles.emptyTitle}>לא נמצאו גלגלים</div>
              <div style={styles.emptyText}>נסה לשנות את הסינון או להוסיף גלגלים חדשים</div>
            </div>
          )}
          {filteredWheels.map(wheel => (
            <div
              key={wheel.id}
              id={`wheel-${wheel.wheel_number}`}
              style={{
                ...styles.card,
                ...(wheel.is_available ? {} : styles.cardTaken),
                transition: 'box-shadow 0.3s ease'
              }}
            >
              <div style={styles.cardImage}>
                <img
                  src={wheel.is_donut ? '/wheel-donut.png' : '/wheel-normal.png'}
                  alt={wheel.is_donut ? 'דונאט' : 'גלגל'}
                  style={styles.wheelImg}
                />
                <span style={styles.cardNumber}>#{wheel.wheel_number}</span>
                {wheel.is_donut && <span style={styles.donutBadge}>דונאט</span>}
                <span style={{
                  ...styles.cardStatus,
                  ...(wheel.is_available ? styles.statusAvailable : styles.statusTaken)
                }}>
                  {wheel.is_available ? 'זמין' : 'מושאל'}
                </span>
              </div>
              <div style={styles.cardInfo}>
                <div style={styles.cardSpecs}>
                  <span style={styles.spec}>{wheel.rim_size}"</span>
                  <span style={styles.spec}>{wheel.bolt_count}×{wheel.bolt_spacing}</span>
                </div>
                {wheel.category && <div style={styles.cardCategory}>{wheel.category}</div>}
                {wheel.notes && <div style={styles.cardNotes}>{wheel.notes}</div>}

                {/* Borrower info when wheel is taken */}
                {!wheel.is_available && wheel.current_borrow && (
                  <div style={styles.borrowerInfo}>
                    <div style={styles.borrowerName}>👤 {wheel.current_borrow.borrower_name}</div>
                    <div style={styles.borrowerPhone}>📱 {wheel.current_borrow.borrower_phone}</div>
                    {wheel.current_borrow.borrow_date && (
                      <div style={styles.borrowDate}>📅 {new Date(wheel.current_borrow.borrow_date).toLocaleDateString('he-IL')}</div>
                    )}
                  </div>
                )}

                {/* Manager action buttons - only show return for borrowed wheels */}
                {isManager && (
                  <div style={styles.cardActions} className="station-card-actions">
                    {!wheel.is_available && (
                      <button
                        style={styles.returnBtn}
                        onClick={() => handleReturn(wheel)}
                        disabled={actionLoading}
                      >
                        📥 החזר
                      </button>
                    )}
                    <button
                      style={styles.deleteBtn}
                      onClick={() => handleDeleteWheel(wheel)}
                      disabled={actionLoading}
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Wheels Table View */}
      {viewMode === 'table' && (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>ג'אנט</th>
                <th style={styles.th}>ברגים</th>
                <th style={styles.th}>קטגוריה</th>
                <th style={styles.th}>סוג</th>
                <th style={styles.th}>הערות</th>
                <th style={styles.th}>סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {filteredWheels.length === 0 && (
                <tr>
                  <td colSpan={7} style={{padding: '40px'}}>
                    <div style={styles.emptyState}>
                      <div style={styles.emptyIcon}>🛞</div>
                      <div style={styles.emptyTitle}>לא נמצאו גלגלים</div>
                      <div style={styles.emptyText}>נסה לשנות את הסינון או להוסיף גלגלים חדשים</div>
                    </div>
                  </td>
                </tr>
              )}
              {filteredWheels.map(wheel => (
                <tr key={wheel.id} id={`wheel-${wheel.wheel_number}`} style={{...(wheel.is_available ? {} : styles.rowTaken), transition: 'box-shadow 0.3s ease'}}>
                  <td style={styles.td}><strong>{wheel.wheel_number}</strong></td>
                  <td style={styles.td}>{wheel.rim_size}"</td>
                  <td style={styles.td}>{wheel.bolt_count}×{wheel.bolt_spacing}</td>
                  <td style={styles.td}>{wheel.category || '-'}</td>
                  <td style={styles.td}>
                    {wheel.is_donut ? (
                      <span style={styles.donutTag}>דונאט</span>
                    ) : 'מלא'}
                  </td>
                  <td style={{...styles.td, color: '#a0aec0'}}>{wheel.notes || ''}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.tableStatus,
                      ...(wheel.is_available ? styles.tableStatusAvailable : styles.tableStatusTaken)
                    }}>
                      {wheel.is_available ? 'זמין' : 'מושאל'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </>
      )}

      {/* Floating Contact Button - only show when not logged in as manager */}
      {!currentManager && station.wheel_station_managers.length > 0 && (
        <button
          onClick={() => setShowContactsModal(true)}
          style={{
            position: 'fixed',
            bottom: '80px',
            left: '20px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#fff',
            border: 'none',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            zIndex: 100,
          }}
          title="צור קשר עם מנהל"
        >
          📞
        </button>
      )}

      {/* Contacts Modal */}
      {showContactsModal && (
        <div style={styles.modalOverlay} onClick={() => setShowContactsModal(false)}>
          <div style={{...styles.modal, maxWidth: '350px'}} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>📞 צור קשר עם מנהל</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px'}}>
              {station.wheel_station_managers.map(manager => {
                const cleanPhone = manager.phone.replace(/\D/g, '')
                const internationalPhone = cleanPhone.startsWith('0') ? '972' + cleanPhone.slice(1) : cleanPhone
                return (
                  <div
                    key={manager.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '8px',
                      border: '1px solid #4b5563',
                    }}
                  >
                    <span style={{fontWeight: '500', color: '#fff'}}>{manager.full_name}</span>
                    <div style={{display: 'flex', gap: '8px'}}>
                      <a
                        href={`tel:${cleanPhone}`}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: '#3b82f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textDecoration: 'none',
                          fontSize: '16px',
                        }}
                        title="התקשר"
                      >
                        📞
                      </a>
                      <a
                        href={`https://wa.me/${internationalPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: '#22c55e',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textDecoration: 'none',
                          fontSize: '16px',
                        }}
                        title="וואטסאפ"
                      >
                        💬
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
            <button style={{...styles.cancelBtn, width: '100%', marginTop: '16px'}} onClick={() => setShowContactsModal(false)}>
              סגור
            </button>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div style={styles.modalOverlay} onClick={() => setShowLoginModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>🔐 כניסת מנהל</h3>
            <p style={styles.modalSubtitle}>הזן את פרטי ההתחברות שלך</p>
            <div style={styles.formGroup}>
              <label style={styles.label}>שם משתמש</label>
              <input
                type="text"
                placeholder="הזן שם משתמש"
                value={loginPhone}
                onChange={e => setLoginPhone(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>סיסמת תחנה</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  placeholder="סיסמא"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  style={{...styles.input, paddingLeft: '40px'}}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    fontSize: '16px',
                    opacity: 0.7,
                  }}
                >
                  {showLoginPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            {loginError && <div style={styles.errorText}>{loginError}</div>}
            <div style={styles.modalButtons}>
              <button style={styles.cancelBtn} onClick={() => setShowLoginModal(false)}>ביטול</button>
              <button style={styles.submitBtn} onClick={handleLogin} disabled={actionLoading}>
                {actionLoading ? 'מתחבר...' : 'כניסה'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Wheel Modal */}
      {showAddWheelModal && (
        <div style={styles.modalOverlay} onClick={() => { setShowAddWheelModal(false); setShowCustomCategory(false) }}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>➕ הוספת גלגל חדש</h3>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>מספר גלגל *</label>
                <input
                  type="text"
                  placeholder="A23, 15, וכו'"
                  value={wheelForm.wheel_number}
                  onChange={e => { setWheelForm({...wheelForm, wheel_number: e.target.value}); setWheelFormErrors(wheelFormErrors.filter(e => e !== 'wheel_number')) }}
                  style={{...styles.input, ...(wheelFormErrors.includes('wheel_number') ? styles.inputError : {})}}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>גודל ג'אנט *</label>
                <input
                  type="text"
                  placeholder='14", 15", 16"'
                  value={wheelForm.rim_size}
                  onChange={e => { setWheelForm({...wheelForm, rim_size: e.target.value}); setWheelFormErrors(wheelFormErrors.filter(e => e !== 'rim_size')) }}
                  style={{...styles.input, ...(wheelFormErrors.includes('rim_size') ? styles.inputError : {})}}
                />
              </div>
            </div>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>כמות ברגים</label>
                <select
                  value={wheelForm.bolt_count}
                  onChange={e => setWheelForm({...wheelForm, bolt_count: e.target.value})}
                  style={styles.input}
                >
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>מרווח ברגים *</label>
                <input
                  type="text"
                  placeholder="100, 108, 114.3"
                  value={wheelForm.bolt_spacing}
                  onChange={e => { setWheelForm({...wheelForm, bolt_spacing: e.target.value}); setWheelFormErrors(wheelFormErrors.filter(e => e !== 'bolt_spacing')) }}
                  style={{...styles.input, ...(wheelFormErrors.includes('bolt_spacing') ? styles.inputError : {})}}
                />
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>קטגוריה</label>
              {!showCustomCategory ? (
                <select
                  value={predefinedCategories.includes(wheelForm.category) ? wheelForm.category : ''}
                  onChange={e => {
                    if (e.target.value === '__custom__') {
                      setShowCustomCategory(true)
                      setWheelForm({...wheelForm, category: ''})
                    } else {
                      setWheelForm({...wheelForm, category: e.target.value})
                    }
                  }}
                  style={styles.input}
                >
                  <option value="">ללא קטגוריה</option>
                  {predefinedCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="__custom__">➕ קטגוריה אחרת...</option>
                </select>
              ) : (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="הזן קטגוריה..."
                    value={wheelForm.category}
                    onChange={e => setWheelForm({...wheelForm, category: e.target.value})}
                    style={{ ...styles.input, flex: 1 }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => { setShowCustomCategory(false); setWheelForm({...wheelForm, category: ''}) }}
                    style={{ ...styles.smallBtn, background: '#4a5568' }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            <div style={styles.checkboxGroup}>
              <input
                type="checkbox"
                id="is_donut"
                checked={wheelForm.is_donut}
                onChange={e => setWheelForm({...wheelForm, is_donut: e.target.checked})}
              />
              <label htmlFor="is_donut" style={styles.checkboxLabel}>גלגל דונאט (חילוף)</label>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>הערות</label>
              <input
                type="text"
                value={wheelForm.notes}
                onChange={e => setWheelForm({...wheelForm, notes: e.target.value})}
                style={styles.input}
              />
            </div>
            <div style={styles.modalButtons}>
              <button style={styles.cancelBtn} onClick={() => setShowAddWheelModal(false)}>ביטול</button>
              <button style={styles.submitBtn} onClick={handleAddWheel} disabled={actionLoading}>
                {actionLoading ? 'שומר...' : 'הוסף'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Details Modal */}
      {showEditDetailsModal && (
        <div style={styles.modalOverlay} onClick={() => setShowEditDetailsModal(false)}>
          <div style={{...styles.modal, maxWidth: '550px'}} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>⚙️ עריכת פרטי תחנה</h3>

            {/* Section: Address */}
            <div style={{marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px'}}>
              <h4 style={{margin: '0 0 12px', color: '#f59e0b', fontSize: '1rem'}}>📍 כתובת התחנה</h4>
              <div style={styles.formGroup}>
                <input
                  type="text"
                  value={editAddress}
                  onChange={e => setEditAddress(e.target.value)}
                  style={styles.input}
                  placeholder="רחוב, מספר, עיר"
                />
              </div>
              <button
                style={{...styles.smallBtn, background: '#10b981'}}
                onClick={async () => {
                  setActionLoading(true)
                  try {
                    const response = await fetch(`/api/wheel-stations/${stationId}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        address: editAddress,
                        manager_phone: currentManager?.phone,
                        current_password: sessionPassword
                      })
                    })
                    if (!response.ok) {
                      const data = await response.json()
                      throw new Error(data.error || 'Failed to update')
                    }
                    await fetchStation()
                    toast.success('הכתובת עודכנה!')
                  } catch (err: unknown) {
                    toast.error(err instanceof Error ? err.message : 'שגיאה בעדכון')
                  } finally {
                    setActionLoading(false)
                  }
                }}
                disabled={actionLoading}
              >
                {actionLoading ? 'שומר...' : 'שמור כתובת'}
              </button>
            </div>

            {/* Section: Deposit Settings */}
            <div style={{marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px'}}>
              <h4 style={{margin: '0 0 12px', color: '#f59e0b', fontSize: '1rem'}}>💰 הגדרות פיקדון ואמצעי תשלום</h4>

              {/* Deposit Amount */}
              <div style={{marginBottom: '16px'}}>
                <label style={{fontSize: '0.85rem', color: '#9ca3af', marginBottom: '4px', display: 'block'}}>סכום פיקדון (₪)</label>
                <input
                  type="number"
                  value={editDepositAmount}
                  onChange={e => setEditDepositAmount(e.target.value)}
                  style={{...styles.input, width: '120px'}}
                  placeholder="200"
                />
              </div>

              {/* Payment Methods */}
              <div style={{fontSize: '0.85rem', color: '#9ca3af', marginBottom: '8px'}}>אמצעי תשלום זמינים:</div>
              <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                {/* Cash */}
                <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                  <input
                    type="checkbox"
                    checked={editPaymentMethods.cash || false}
                    onChange={e => setEditPaymentMethods({...editPaymentMethods, cash: e.target.checked})}
                  />
                  <span style={{color: '#fff'}}>💵 מזומן</span>
                </label>

                {/* Bit */}
                <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                  <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                    <input
                      type="checkbox"
                      checked={editPaymentMethods.bit?.enabled || false}
                      onChange={e => setEditPaymentMethods({
                        ...editPaymentMethods,
                        bit: { enabled: e.target.checked, phone: editPaymentMethods.bit?.phone || '' }
                      })}
                    />
                    <span style={{color: '#fff'}}>📱 ביט</span>
                  </label>
                  {editPaymentMethods.bit?.enabled && (
                    <input
                      type="tel"
                      value={editPaymentMethods.bit?.phone || ''}
                      onChange={e => setEditPaymentMethods({
                        ...editPaymentMethods,
                        bit: { enabled: true, phone: e.target.value }
                      })}
                      style={{...styles.input, marginRight: '26px', width: 'calc(100% - 26px)'}}
                      placeholder="מספר טלפון לביט"
                    />
                  )}
                </div>

                {/* Paybox */}
                <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                  <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                    <input
                      type="checkbox"
                      checked={editPaymentMethods.paybox?.enabled || false}
                      onChange={e => setEditPaymentMethods({
                        ...editPaymentMethods,
                        paybox: { enabled: e.target.checked, phone: editPaymentMethods.paybox?.phone || '' }
                      })}
                    />
                    <span style={{color: '#fff'}}>📦 פייבוקס</span>
                  </label>
                  {editPaymentMethods.paybox?.enabled && (
                    <input
                      type="tel"
                      value={editPaymentMethods.paybox?.phone || ''}
                      onChange={e => setEditPaymentMethods({
                        ...editPaymentMethods,
                        paybox: { enabled: true, phone: e.target.value }
                      })}
                      style={{...styles.input, marginRight: '26px', width: 'calc(100% - 26px)'}}
                      placeholder="מספר טלפון לפייבוקס"
                    />
                  )}
                </div>

                {/* Bank Transfer */}
                <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                  <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                    <input
                      type="checkbox"
                      checked={editPaymentMethods.bank_transfer?.enabled || false}
                      onChange={e => setEditPaymentMethods({
                        ...editPaymentMethods,
                        bank_transfer: { enabled: e.target.checked, details: editPaymentMethods.bank_transfer?.details || '' }
                      })}
                    />
                    <span style={{color: '#fff'}}>🏦 העברה בנקאית</span>
                  </label>
                  {editPaymentMethods.bank_transfer?.enabled && (
                    <textarea
                      value={editPaymentMethods.bank_transfer?.details || ''}
                      onChange={e => setEditPaymentMethods({
                        ...editPaymentMethods,
                        bank_transfer: { enabled: true, details: e.target.value }
                      })}
                      style={{...styles.input, marginRight: '26px', width: 'calc(100% - 26px)', minHeight: '60px'}}
                      placeholder="פרטי חשבון בנק..."
                    />
                  )}
                </div>

                {/* ID Deposit */}
                <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                  <input
                    type="checkbox"
                    checked={editPaymentMethods.id_deposit || false}
                    onChange={e => setEditPaymentMethods({...editPaymentMethods, id_deposit: e.target.checked})}
                  />
                  <span style={{color: '#fff'}}>🪪 פיקדון ת.ז. (באישור מנהל)</span>
                </label>

                {/* License Deposit */}
                <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                  <input
                    type="checkbox"
                    checked={editPaymentMethods.license_deposit || false}
                    onChange={e => setEditPaymentMethods({...editPaymentMethods, license_deposit: e.target.checked})}
                  />
                  <span style={{color: '#fff'}}>🚗 פיקדון רישיון נהיגה (באישור מנהל)</span>
                </label>
              </div>

              <button
                style={{...styles.smallBtn, background: '#10b981', marginTop: '16px'}}
                onClick={async () => {
                  setActionLoading(true)
                  try {
                    const response = await fetch(`/api/wheel-stations/${stationId}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        deposit_amount: editDepositAmount ? parseInt(editDepositAmount) : 200,
                        payment_methods: editPaymentMethods,
                        manager_phone: currentManager?.phone,
                        current_password: sessionPassword
                      })
                    })
                    if (!response.ok) {
                      const data = await response.json()
                      throw new Error(data.error || 'Failed to update')
                    }
                    await fetchStation()
                    toast.success('הגדרות התשלום עודכנו!')
                  } catch (err: unknown) {
                    toast.error(err instanceof Error ? err.message : 'שגיאה בעדכון')
                  } finally {
                    setActionLoading(false)
                  }
                }}
                disabled={actionLoading}
              >
                {actionLoading ? 'שומר...' : 'שמור הגדרות תשלום'}
              </button>
            </div>

            {/* Section: Contacts */}
            <div style={{marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px'}}>
              <h4 style={{margin: '0 0 12px', color: '#f59e0b', fontSize: '1rem'}}>👥 אנשי קשר ({contacts.length}/4)</h4>
              {contacts.map((contact, index) => (
                <div key={index} style={{display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap'}} className="edit-details-contact-row">
                  <input
                    type="text"
                    placeholder="שם מלא"
                    value={contact.full_name}
                    onChange={e => updateContact(index, 'full_name', e.target.value)}
                    style={{...styles.input, flex: 1, minWidth: '120px'}}
                  />
                  <input
                    type="tel"
                    placeholder="טלפון"
                    value={contact.phone}
                    onChange={e => updateContact(index, 'phone', e.target.value)}
                    style={{...styles.input, flex: 1, minWidth: '100px'}}
                  />
                  <button style={styles.removeBtn} onClick={() => removeContact(index)}>✕</button>
                </div>
              ))}
              <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                <button style={{...styles.smallBtn, background: '#3b82f6'}} onClick={addContact} disabled={contacts.length >= 4}>
                  ➕ הוסף איש קשר
                </button>
                <button style={{...styles.smallBtn, background: '#10b981'}} onClick={handleSaveContacts} disabled={actionLoading}>
                  {actionLoading ? 'שומר...' : 'שמור אנשי קשר'}
                </button>
              </div>
            </div>

            {/* Section: Password */}
            <div style={{marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px'}}>
              <h4 style={{margin: '0 0 12px', color: '#f59e0b', fontSize: '1rem'}}>🔑 שינוי סיסמה</h4>
              <p style={{fontSize: '0.85rem', color: '#a0aec0', margin: '0 0 12px'}}>הסיסמה משותפת לכל מנהלי התחנה</p>
              <div style={styles.formGroup}>
                <label style={styles.label}>סיסמה נוכחית</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordForm.current}
                    onChange={e => setPasswordForm({...passwordForm, current: e.target.value})}
                    style={{...styles.input, paddingLeft: '40px'}}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      fontSize: '16px',
                      opacity: 0.7,
                    }}
                  >
                    {showCurrentPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                <div style={{...styles.formGroup, flex: 1, minWidth: '120px'}}>
                  <label style={styles.label}>סיסמה חדשה</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.new}
                      onChange={e => setPasswordForm({...passwordForm, new: e.target.value})}
                      style={{...styles.input, paddingLeft: '40px'}}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{
                        position: 'absolute',
                        left: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        fontSize: '16px',
                        opacity: 0.7,
                      }}
                    >
                      {showNewPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <div style={{...styles.formGroup, flex: 1, minWidth: '120px'}}>
                  <label style={styles.label}>אימות</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordForm.confirm}
                      onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})}
                      style={{...styles.input, paddingLeft: '40px'}}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: 'absolute',
                        left: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        fontSize: '16px',
                        opacity: 0.7,
                      }}
                    >
                      {showConfirmPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              </div>
              <button style={{...styles.smallBtn, background: '#f59e0b', color: '#000'}} onClick={handleChangePassword} disabled={actionLoading}>
                {actionLoading ? 'שומר...' : 'שנה סיסמה'}
              </button>
            </div>

            {/* Section: Push Notifications */}
            <div style={{marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px'}}>
              <h4 style={{margin: '0 0 12px', color: '#f59e0b', fontSize: '1rem'}}>🔔 התראות</h4>
              <p style={{fontSize: '0.85rem', color: '#a0aec0', margin: '0 0 12px'}}>
                קבל התראה קופצת בכל בקשת השאלה חדשה
              </p>
              {pushSupported ? (
                <button
                  style={{
                    ...styles.smallBtn,
                    background: pushEnabled ? '#ef4444' : '#22c55e',
                    width: '100%'
                  }}
                  onClick={handleTogglePush}
                  disabled={enablingPush}
                >
                  {enablingPush ? 'מעדכן...' : pushEnabled ? '🔕 כבה התראות' : '🔔 הפעל התראות'}
                </button>
              ) : (
                <p style={{fontSize: '0.8rem', color: '#9ca3af', fontStyle: 'italic'}}>
                  {getPushNotSupportedReason() || 'התראות לא נתמכות בדפדפן זה'}
                </p>
              )}
            </div>

            <button style={{...styles.cancelBtn, width: '100%'}} onClick={() => setShowEditDetailsModal(false)}>סגור</button>
          </div>
        </div>
      )}

      {/* Excel Import/Export Modal */}
      {showExcelModal && (
        <div style={styles.modalOverlay} onClick={() => setShowExcelModal(false)}>
          <div style={{...styles.modal, maxWidth: '400px', textAlign: 'center'}} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>📊 ייבוא / ייצוא Excel</h3>
            <p style={styles.modalSubtitle}>בחר את הפעולה הרצויה</p>

            <div style={{display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px'}}>
              <button
                style={styles.excelImportBtn}
                onClick={() => {
                  setShowExcelModal(false)
                  fileInputRef.current?.click()
                }}
                disabled={uploadLoading}
              >
                📤 {uploadLoading ? 'מעלה...' : 'ייבוא מקובץ Excel'}
                <span style={{display: 'block', fontSize: '0.8rem', marginTop: '5px', opacity: 0.8}}>
                  העלה קובץ Excel להוספת גלגלים
                </span>
              </button>

              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                <span style={{fontWeight: 'bold', color: '#fff', marginBottom: '4px'}}>📥 ייצוא לקובץ Excel:</span>
                <button
                  style={{...styles.excelExportBtn, padding: '10px 16px'}}
                  onClick={() => handleExportExcel('inventory')}
                >
                  🛞 מלאי גלגלים בלבד
                </button>
                <button
                  style={{...styles.excelExportBtn, padding: '10px 16px'}}
                  onClick={() => handleExportExcel('history')}
                >
                  📋 היסטוריית השאלות בלבד
                </button>
                <button
                  style={{...styles.excelExportBtn, padding: '10px 16px'}}
                  onClick={() => handleExportExcel('all')}
                >
                  📦 הכל (מלאי + היסטוריה)
                </button>
              </div>

              <a
                href="/wheels-template.html"
                target="_blank"
                style={styles.excelTemplateBtn}
                onClick={() => setShowExcelModal(false)}
              >
                📋 הורד תבנית ריקה
                <span style={{display: 'block', fontSize: '0.8rem', marginTop: '5px', opacity: 0.8}}>
                  קובץ עם כותרות בלבד להעתקה
                </span>
              </a>
            </div>

            <button style={{...styles.cancelBtn, width: '100%', marginTop: '20px'}} onClick={() => setShowExcelModal(false)}>
              סגור
            </button>
          </div>
        </div>
      )}

      {/* Confirm Dialog Modal */}
      {showConfirmDialog && confirmDialogData && (
        <div style={styles.modalOverlay} onClick={closeConfirmDialog}>
          <div style={styles.confirmDialog} onClick={e => e.stopPropagation()}>
            <h3 style={{
              ...styles.confirmTitle,
              color: confirmDialogData.variant === 'danger' ? '#ef4444' :
                     confirmDialogData.variant === 'warning' ? '#f59e0b' : '#3b82f6'
            }}>
              {confirmDialogData.title}
            </h3>
            <p style={{...styles.confirmMessage, whiteSpace: 'pre-line'}}>{confirmDialogData.message}</p>
            <div style={styles.confirmButtons}>
              <button style={styles.cancelBtn} onClick={closeConfirmDialog}>
                {confirmDialogData.cancelText || 'ביטול'}
              </button>
              <button
                style={{
                  ...styles.confirmBtn,
                  background: confirmDialogData.variant === 'danger' ? '#ef4444' :
                             confirmDialogData.variant === 'warning' ? '#f59e0b' : '#3b82f6'
                }}
                onClick={confirmDialogData.onConfirm}
              >
                {confirmDialogData.confirmText || 'אישור'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #374151 0%, #4b5563 100%)',
    color: '#fff',
    padding: '20px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    direction: 'rtl',
  },
  header: {
    marginBottom: '20px',
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  backBtn: {
    color: '#a0aec0',
    textDecoration: 'none',
    fontSize: '0.9rem',
  },
  managerBtn: {
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: '#000',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.9rem',
  },
  title: {
    fontSize: '1.8rem',
    margin: '10px 0',
    color: '#f59e0b',
  },
  address: {
    color: '#a0aec0',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '50vh',
    gap: '20px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255,255,255,0.1)',
    borderTopColor: '#f59e0b',
    borderRadius: '50%',
  },
  error: {
    textAlign: 'center',
    padding: '40px',
  },
  backLink: {
    color: '#a0aec0',
    textDecoration: 'none',
    marginTop: '20px',
    display: 'inline-block',
  },
  stats: {
    display: 'flex',
    gap: '20px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  stat: {
    background: 'rgba(255,255,255,0.05)',
    padding: '15px 25px',
    borderRadius: '12px',
    textAlign: 'center',
    minWidth: '100px',
  },
  statAvailable: {},
  statTaken: {},
  statValue: {
    fontSize: '1.8rem',
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#a0aec0',
    fontSize: '0.9rem',
  },
  filters: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '15px',
    marginBottom: '20px',
  },
  filtersHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  filtersTitle: {
    color: '#f59e0b',
    fontSize: '1rem',
    margin: 0,
  },
  filtersToggle: {
    background: 'transparent',
    border: '1px solid #4a5568',
    color: '#a0aec0',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  filtersToggleActive: {
    background: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#f59e0b',
    color: '#f59e0b',
  },
  filterRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginTop: '12px',
  },
  filterGroup: {
    flex: 1,
    minWidth: '100px',
  },
  filterLabel: {
    display: 'block',
    marginBottom: '4px',
    color: '#a0aec0',
    fontSize: '0.8rem',
  },
  filterSelect: {
    width: '100%',
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid #4a5568',
    background: '#2d3748',
    color: 'white',
    fontSize: '0.9rem',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px',
  },
  viewToggle: {
    display: 'flex',
    gap: '5px',
    background: 'rgba(255,255,255,0.1)',
    padding: '4px',
    borderRadius: '8px',
  },
  viewBtn: {
    background: 'transparent',
    border: 'none',
    color: '#a0aec0',
    padding: '8px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  viewBtnActive: {
    background: '#f59e0b',
    color: '#000',
  },
  resultsCount: {
    color: '#a0aec0',
    fontSize: '0.9rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '15px',
    marginBottom: '30px',
  },
  card: {
    background: 'linear-gradient(145deg, #2d3748, #1a202c)',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '2px solid transparent',
  },
  cardTaken: {
    opacity: 0.85,
    borderColor: '#ef4444',
  },
  cardImage: {
    width: '100%',
    height: '100px',
    background: 'linear-gradient(135deg, #374151, #1f2937)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  wheelImg: {
    width: '70px',
    height: '70px',
    objectFit: 'contain',
  },
  cardNumber: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    background: 'rgba(0,0,0,0.7)',
    color: '#f59e0b',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    padding: '4px 10px',
    borderRadius: '6px',
  },
  donutBadge: {
    position: 'absolute',
    top: '8px',
    left: '8px',
    background: '#a855f7',
    color: 'white',
    fontSize: '0.75rem',
    padding: '3px 6px',
    borderRadius: '4px',
  },
  cardStatus: {
    position: 'absolute',
    bottom: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: 'bold',
  },
  statusAvailable: {
    background: 'rgba(16, 185, 129, 0.3)',
    color: '#10b981',
  },
  statusTaken: {
    background: 'rgba(239, 68, 68, 0.3)',
    color: '#ef4444',
  },
  cardInfo: {
    padding: '12px',
  },
  cardSpecs: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '8px',
  },
  spec: {
    background: 'rgba(255,255,255,0.1)',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '0.85rem',
  },
  cardCategory: {
    color: '#a0aec0',
    fontSize: '0.85rem',
  },
  cardNotes: {
    color: '#718096',
    fontSize: '0.8rem',
    marginTop: '5px',
  },
  tableWrapper: {
    overflowX: 'auto',
    marginBottom: '30px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  th: {
    background: 'rgba(245, 158, 11, 0.2)',
    padding: '12px 15px',
    textAlign: 'right',
    fontWeight: 600,
    color: '#f59e0b',
    fontSize: '0.9rem',
  },
  td: {
    padding: '12px 15px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    fontSize: '0.9rem',
  },
  rowTaken: {
    opacity: 0.7,
  },
  donutTag: {
    background: 'rgba(168, 85, 247, 0.2)',
    color: '#a855f7',
    padding: '3px 8px',
    borderRadius: '8px',
    fontSize: '0.75rem',
  },
  tableStatus: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: 'bold',
  },
  tableStatusAvailable: {
    background: 'rgba(16, 185, 129, 0.2)',
    color: '#10b981',
  },
  tableStatusTaken: {
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
  },
  contacts: {
    marginTop: '30px',
  },
  contactsTitle: {
    color: '#f59e0b',
    marginBottom: '15px',
    fontSize: '1.1rem',
  },
  contactsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  contactCard: {
    padding: '16px',
    background: 'linear-gradient(135deg, #eff6ff, #e0e7ff)',
    borderRadius: '12px',
    border: '2px solid #bfdbfe',
  },
  contactName: {
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '12px',
    fontSize: '1rem',
    textAlign: 'center',
  },
  contactButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  contactBtnCall: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '12px',
    background: '#3b82f6',
    color: 'white',
    fontWeight: 600,
    fontSize: '0.9rem',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
  },
  contactBtnWhatsapp: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '12px',
    background: '#22c55e',
    color: 'white',
    fontWeight: 600,
    fontSize: '0.9rem',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
  },
  // Manager mode styles
  managerActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  addBtn: {
    background: '#10b981',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.85rem',
  },
  templateBtn: {
    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  editContactsBtn: {
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.85rem',
  },
  changePasswordBtn: {
    background: '#8b5cf6',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.85rem',
  },
  logoutBtn: {
    background: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.85rem',
  },
  managerBadge: {
    display: 'inline-block',
    background: 'rgba(16, 185, 129, 0.2)',
    color: '#10b981',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    marginTop: '10px',
  },
  // Card action buttons
  borrowerInfo: {
    marginTop: '10px',
    padding: '10px',
    background: 'rgba(239, 68, 68, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },
  borrowerName: {
    fontWeight: 'bold',
    color: '#ef4444',
    fontSize: '0.85rem',
  },
  borrowerPhone: {
    color: '#f87171',
    fontSize: '0.8rem',
  },
  borrowDate: {
    color: '#a0aec0',
    fontSize: '0.75rem',
    marginTop: '4px',
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    paddingTop: '12px',
  },
  borrowBtn: {
    flex: 1,
    background: '#10b981',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.85rem',
  },
  returnBtn: {
    flex: 1,
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.85rem',
  },
  deleteBtn: {
    background: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    background: '#1e293b',
    borderRadius: '16px',
    padding: '25px',
    width: '100%',
    maxWidth: '400px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalTitle: {
    color: '#f59e0b',
    marginBottom: '10px',
    fontSize: '1.3rem',
  },
  modalSubtitle: {
    color: '#a0aec0',
    fontSize: '0.9rem',
    marginBottom: '20px',
  },
  formGroup: {
    marginBottom: '15px',
  },
  formRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    color: '#a0aec0',
    fontSize: '0.85rem',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #4a5568',
    background: '#2d3748',
    color: 'white',
    fontSize: '0.95rem',
  },
  inputError: {
    border: '2px solid #ef4444',
    background: 'rgba(239, 68, 68, 0.15)',
  },
  inputSmall: {
    flex: 1,
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid #4a5568',
    background: '#2d3748',
    color: 'white',
    fontSize: '0.85rem',
    minWidth: '80px',
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '15px',
  },
  checkboxLabel: {
    color: '#a0aec0',
    fontSize: '0.9rem',
  },
  modalButtons: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px',
  },
  cancelBtn: {
    flex: 1,
    background: '#4a5568',
    color: 'white',
    border: 'none',
    padding: '12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  submitBtn: {
    flex: 1,
    background: '#f59e0b',
    color: '#000',
    border: 'none',
    padding: '12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  smallBtn: {
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.85rem',
  },
  removeBtn: {
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: '0.85rem',
    marginTop: '8px',
  },
  // Contact edit styles
  contactEditRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    marginBottom: '12px',
    padding: '10px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
  },
  contactEditFields: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  removeContactBtn: {
    background: '#ef4444',
    color: 'white',
    border: 'none',
    width: '30px',
    height: '30px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  addContactBtn: {
    width: '100%',
    background: 'transparent',
    border: '2px dashed #4a5568',
    color: '#a0aec0',
    padding: '12px',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '10px',
  },
  // Confirm dialog styles
  confirmDialog: {
    background: '#1e293b',
    borderRadius: '16px',
    padding: '25px',
    width: '100%',
    maxWidth: '360px',
    textAlign: 'center',
    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
  },
  confirmTitle: {
    fontSize: '1.3rem',
    marginBottom: '12px',
    fontWeight: 'bold',
  },
  confirmMessage: {
    color: '#a0aec0',
    fontSize: '1rem',
    marginBottom: '25px',
    lineHeight: 1.5,
  },
  confirmButtons: {
    display: 'flex',
    gap: '12px',
  },
  confirmBtn: {
    flex: 1,
    color: 'white',
    border: 'none',
    padding: '14px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1rem',
  },
  // Excel button styles
  excelBtn: {
    background: 'linear-gradient(135deg, #059669, #047857)',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.85rem',
  },
  excelImportBtn: {
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: 'white',
    border: 'none',
    padding: '20px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1.1rem',
    textAlign: 'center' as const,
  },
  excelExportBtn: {
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    padding: '20px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1.1rem',
    textAlign: 'center' as const,
  },
  excelTemplateBtn: {
    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    color: 'white',
    border: 'none',
    padding: '20px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1.1rem',
    textAlign: 'center' as const,
    textDecoration: 'none',
    display: 'block',
  },
  // Tab navigation
  tabNav: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    background: 'rgba(255,255,255,0.05)',
    padding: '8px',
    borderRadius: '12px',
  },
  tabBtn: {
    flex: 1,
    padding: '12px 20px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.95rem',
    background: 'transparent',
    color: '#a0aec0',
    transition: 'all 0.2s',
  },
  tabBtnActive: {
    background: '#f59e0b',
    color: '#000',
  },
  // Tracking section
  trackingSection: {
    marginBottom: '20px',
  },
  trackingStats: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  trackingStat: {
    flex: 1,
    minWidth: '100px',
    background: 'rgba(255,255,255,0.05)',
    padding: '15px',
    borderRadius: '12px',
    textAlign: 'center',
  },
  trackingStatValue: {
    fontSize: '1.8rem',
    fontWeight: 'bold',
  },
  trackingStatLabel: {
    color: '#a0aec0',
    fontSize: '0.8rem',
    marginTop: '5px',
  },
  trackingFilterTabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '15px',
    flexWrap: 'wrap',
  },
  trackingFilterBtn: {
    padding: '8px 16px',
    borderRadius: '20px',
    border: 'none',
    fontSize: '0.9rem',
    cursor: 'pointer',
    background: '#4b5563',
    color: '#d1d5db',
  },
  trackingFilterBtnActive: {
    background: '#3b82f6',
    color: 'white',
  },
  trackingFilterBtnPending: {
    background: '#ec4899',
    color: 'white',
  },
  trackingTableWrapper: {
    overflowX: 'auto',
    marginBottom: '20px',
  },
  trackingTable: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '500px',
  },
  trackingTh: {
    background: '#4b5563',
    color: '#d1d5db',
    padding: '12px 8px',
    textAlign: 'right',
    fontSize: '0.85rem',
  },
  trackingTd: {
    padding: '12px 8px',
    borderBottom: '1px solid #4b5563',
    color: 'white',
    fontSize: '0.9rem',
  },
  borrowerNameCell: {
    fontWeight: 'bold',
    color: '#fff',
  },
  borrowerInfoCell: {
    color: '#9ca3af',
    fontSize: '0.8rem',
  },
  depositBadge: {
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: 600,
    background: '#4b5563',
    color: '#d1d5db',
  },
  depositBadgeMoney: {
    background: '#d1fae5',
    color: '#065f46',
  },
  depositBadgeDoc: {
    background: '#fef3c7',
    color: '#92400e',
  },
  statusWaiting: {
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: 600,
    background: '#fef3c7',
    color: '#92400e',
  },
  statusPending: {
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: 600,
    background: '#fce7f3',
    color: '#be185d',
  },
  statusSigned: {
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: 600,
    background: '#d1fae5',
    color: '#065f46',
  },
  statusReturned: {
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: 600,
    background: '#e0e7ff',
    color: '#3730a3',
  },
  statusOverdue: {
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: 600,
    background: '#fee2e2',
    color: '#991b1b',
  },
  whatsappBtn: {
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: 600,
    background: '#25d366',
    color: 'white',
    textDecoration: 'none',
    display: 'inline-block',
  },
  returnBtnSmall: {
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: 600,
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
  },
  whatsappLinkBox: {
    background: 'rgba(37, 211, 102, 0.1)',
    border: '1px solid #25d366',
    borderRadius: '12px',
    padding: '20px',
    marginTop: '20px',
  },
  whatsappLinkTitle: {
    color: '#25d366',
    fontSize: '1rem',
    margin: '0 0 8px 0',
  },
  whatsappLinkDesc: {
    color: '#9ca3af',
    fontSize: '0.9rem',
    marginBottom: '12px',
  },
  whatsappLinkInput: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  linkInput: {
    flex: 1,
    minWidth: '200px',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #4b5563',
    background: '#2d3748',
    color: 'white',
    fontSize: '0.9rem',
  },
  copyBtn: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    background: '#25d366',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.9rem',
  },
  actionButtons: {
    display: 'flex',
    gap: '6px',
  },
  approveBtn: {
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: 600,
    background: '#10b981',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
  },
  rejectBtn: {
    padding: '6px 10px',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: 600,
    background: '#ef4444',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
  },
  // Empty state styles
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    textAlign: 'center',
  },
  emptyStateCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '16px',
    border: '2px dashed #4b5563',
    gridColumn: '1 / -1',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
    opacity: 0.7,
  },
  emptyTitle: {
    fontSize: '1.2rem',
    fontWeight: 600,
    color: '#f3f4f6',
    marginBottom: '8px',
  },
  emptyText: {
    fontSize: '0.95rem',
    color: '#9ca3af',
  },
  // Mobile card styles for tracking
  mobileCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #4b5563',
  },
  mobileCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid #4b5563',
  },
  mobileCardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '12px',
  },
  mobileCardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.9rem',
  },
  mobileCardActions: {
    display: 'flex',
    gap: '8px',
    paddingTop: '12px',
    borderTop: '1px solid #4b5563',
  },
}
