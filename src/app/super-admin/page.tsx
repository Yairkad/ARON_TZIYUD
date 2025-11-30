'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { City, CityForm, AdminNotification } from '@/types'
import Logo from '@/components/Logo'
import { checkAuth, logout } from '@/lib/auth'

export default function SuperAdminPage() {
  const router = useRouter()
  const [cities, setCities] = useState<City[]>([])
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true) // Add loading state for auth check
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'cities' | 'notifications' | 'settings' | 'users' | 'equipment' | 'emails'>('cities')
  const [showAddCity, setShowAddCity] = useState(false)
  const [newCity, setNewCity] = useState<CityForm & { manager1_email?: string, manager2_email?: string }>({ name: '', manager1_name: '', manager1_phone: '', manager1_email: '', manager2_name: '', manager2_phone: '', manager2_email: '', location_url: '', token_location_url: '' })
  const [editingCity, setEditingCity] = useState<City | null>(null)
  const [changePasswordForm, setChangePasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [cityFilter, setCityFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [citySearchQuery, setCitySearchQuery] = useState('')
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set())

  // Refs for scrolling to forms
  const addCityFormRef = useRef<HTMLDivElement>(null)
  const addUserFormRef = useRef<HTMLDivElement>(null)

  // Users Management State
  const [users, setUsers] = useState<any[]>([])
  const [showAddUser, setShowAddUser] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'city_manager' as 'city_manager' | 'super_admin',
    city_id: '',
    permissions: 'full_access' as 'view_only' | 'approve_requests' | 'full_access',
    phone: '',
    manager_role: '' as '' | 'manager1' | 'manager2',
  })
  const [userFilter, setUserFilter] = useState<'all' | 'city_manager' | 'super_admin'>('all')
  const [userCityFilter, setUserCityFilter] = useState<string>('all')
  const [userSearchQuery, setUserSearchQuery] = useState<string>('')
  const [userSortBy, setUserSortBy] = useState<'name' | 'email' | 'created_at'>('name')
  const [userSortOrder, setUserSortOrder] = useState<'asc' | 'desc'>('asc')
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Email Logs State
  const [emailLogs, setEmailLogs] = useState<any[]>([])
  const [emailLogsLoading, setEmailLogsLoading] = useState(false)
  const [emailTypeFilter, setEmailTypeFilter] = useState<string>('all')
  const [emailSearchQuery, setEmailSearchQuery] = useState('')
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set())

  // Custom Email State
  const [showCustomEmailForm, setShowCustomEmailForm] = useState(false)
  const [customEmailTo, setCustomEmailTo] = useState('')
  const [customEmailName, setCustomEmailName] = useState('')
  const [customEmailSubject, setCustomEmailSubject] = useState('')
  const [customEmailMessage, setCustomEmailMessage] = useState('')
  const [sendingCustomEmail, setSendingCustomEmail] = useState(false)
  const [sendToAllUsers, setSendToAllUsers] = useState(false)
  const [bulkEmailProgress, setBulkEmailProgress] = useState({ sent: 0, total: 0, failed: 0 })
  const [selectedUsersForEmail, setSelectedUsersForEmail] = useState<Set<string>>(new Set())
  const [showUserSelector, setShowUserSelector] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState('')

  // Email Selection State
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [deletingSelectedEmails, setDeletingSelectedEmails] = useState(false)

  // Password visibility state for all password fields
  const [showChangePasswordCurrent, setShowChangePasswordCurrent] = useState(false)
  const [showChangePasswordNew, setShowChangePasswordNew] = useState(false)
  const [showChangePasswordConfirm, setShowChangePasswordConfirm] = useState(false)
  const [showUserFormPassword, setShowUserFormPassword] = useState(false)

  // Check authentication on mount
  useEffect(() => {
    const verifyAuth = async () => {
      console.log('🔐 Checking authentication...')
      const { authenticated, userType, user } = await checkAuth()
      console.log('🔐 Auth result:', { authenticated, userType, user })

      if (authenticated && userType === 'super') {
        setIsAuthenticated(true)
        setCurrentUser(user)
        console.log('✅ User is authenticated as super admin')
      } else {
        setIsAuthenticated(false)
        setCurrentUser(null)
        console.log('❌ User is not authenticated or not super admin')
      }

      setIsCheckingAuth(false) // Auth check complete
    }
    verifyAuth()
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchCities()
      fetchNotifications()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  // Fetch data when switching tabs
  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'emails') {
        fetchEmailLogs()
        fetchUsers() // Need users for recipient dropdown
      } else if (activeTab === 'users') {
        fetchUsers()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAuthenticated])

  const fetchCities = async () => {
    try {
      console.log('Fetching cities via API...')
      const response = await fetch('/api/super-admin/cities')
      const result = await response.json()

      console.log('Fetch cities response:', {
        success: result.success,
        citiesLength: result.cities?.length,
        activeCities: result.cities?.filter((c: City) => c.is_active).length,
        inactiveCities: result.cities?.filter((c: City) => !c.is_active).length
      })

      if (!response.ok) {
        console.error('Error fetching cities:', result.error)
        return
      }

      // Don't filter here - show all cities (active and inactive)
      setCities(result.cities || [])
      console.log('Cities state updated:', result.cities?.length)
    } catch (error) {
      console.error('Error fetching cities:', error)
    }
  }

  // Filter cities based on selected filter and search
  const filteredCities = cities.filter(city => {
    // First apply status filter
    if (cityFilter === 'active' && !city.is_active) return false
    if (cityFilter === 'inactive' && city.is_active) return false

    // Then apply search filter
    if (citySearchQuery.trim()) {
      const query = citySearchQuery.toLowerCase()
      return (
        city.name.toLowerCase().includes(query) ||
        city.manager1_name.toLowerCase().includes(query) ||
        city.manager1_phone.includes(query) ||
        (city.manager2_name && city.manager2_name.toLowerCase().includes(query)) ||
        (city.manager2_phone && city.manager2_phone.includes(query))
      )
    }

    return true
  })

  // Toggle city expansion
  const toggleCityExpansion = (cityId: string) => {
    setExpandedCities(prev => {
      const next = new Set(prev)
      if (next.has(cityId)) {
        next.delete(cityId)
      } else {
        next.add(cityId)
      }
      return next
    })
  }

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/super-admin/notifications')
      const data = await response.json()

      if (!response.ok) {
        console.error('Error fetching notifications:', data.error)
        return
      }

      setNotifications(data.notifications || [])
      setUnreadCount((data.notifications || []).filter((n: AdminNotification) => !n.is_read).length)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/super-admin/mark-notification-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'שגיאה בסימון ההתראה')
        return
      }

      fetchNotifications()
    } catch (error) {
      console.error('Error marking notification as read:', error)
      alert('שגיאה בסימון ההתראה')
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/super-admin/mark-all-notifications-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'שגיאה בסימון ההתראות')
        return
      }

      fetchNotifications()
    } catch (error) {
      console.error('Error marking all as read:', error)
      alert('שגיאה בסימון ההתראות')
    }
  }

  const deleteAllNotifications = async () => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את כל ההתראות?')) {
      return
    }

    try {
      const response = await fetch('/api/super-admin/delete-all-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'שגיאה במחיקת ההתראות')
        return
      }

      fetchNotifications()
    } catch (error) {
      console.error('Error deleting all notifications:', error)
      alert('שגיאה במחיקת ההתראות')
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch('/api/super-admin/delete-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'שגיאה במחיקת ההתראה')
        return
      }

      fetchNotifications()
    } catch (error) {
      console.error('Error deleting notification:', error)
      alert('שגיאה במחיקת ההתראה')
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
    if (!newCity.name || !newCity.manager1_name || !newCity.manager1_phone) {
      alert('אנא מלא את כל השדות החובה (שם עיר, מנהל ראשון, טלפון)')
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
      const response = await fetch('/api/super-admin/add-city', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCity.name,
          manager1_name: newCity.manager1_name,
          manager1_phone: newCity.manager1_phone,
          manager1_email: newCity.manager1_email || null,
          manager2_name: newCity.manager2_name || null,
          manager2_phone: newCity.manager2_phone || null,
          manager2_email: newCity.manager2_email || null,
          location_url: newCity.location_url || null,
          token_location_url: newCity.token_location_url || null
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'שגיאה בהוספת העיר')
        return
      }

      // Show success message with user info if any were created
      if (data.createdUsers && data.createdUsers.length > 0) {
        const userDetails = data.createdUsers.map((user: any) =>
          `${user.role === 'manager1' ? 'מנהל ראשון' : 'מנהל שני'}:\nמייל: ${user.email}\nסטטוס: ${user.emailSent ? '✅ נשלח מייל עם לינק להגדרת סיסמה' : '❌ שגיאה בשליחת מייל'}`
        ).join('\n\n')

        alert(`${data.message}\n\n📋 פרטי משתמשים שנוצרו:\n\n${userDetails}`)
      } else {
        alert(data.message || 'העיר נוספה בהצלחה!')
      }

      setNewCity({ name: '', manager1_name: '', manager1_phone: '', manager1_email: '', manager2_name: '', manager2_phone: '', manager2_email: '', location_url: '', token_location_url: '' })
      setShowAddCity(false)
      fetchCities()
      // Always refresh users list (in case existing users were linked to this city)
      fetchUsers()
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

    if (!editingCity.name || !editingCity.manager1_name || !editingCity.manager1_phone) {
      alert('אנא מלא את כל השדות החובה (שם עיר, מנהל ראשון, טלפון)')
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
      const response = await fetch('/api/super-admin/update-city', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cityId: editingCity.id,
          name: editingCity.name,
          manager1_name: editingCity.manager1_name,
          manager1_phone: editingCity.manager1_phone,
          manager2_name: editingCity.manager2_name || null,
          manager2_phone: editingCity.manager2_phone || null,
          location_url: editingCity.location_url || null,
          is_active: editingCity.is_active
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'שגיאה בעדכון העיר')
        return
      }

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
      console.log('Toggling city:', city.id, 'to:', !city.is_active)

      const response = await fetch('/api/super-admin/toggle-city', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cityId: city.id,
          is_active: !city.is_active
        }),
      })

      const data = await response.json()
      console.log('Toggle response:', data)

      if (!response.ok) {
        alert(data.error || `שגיאה ב${action} העיר`)
        return
      }

      alert(`העיר ${action}ה בהצלחה!`)
      setCityFilter('all') // Reset filter to "all" to show the toggled city
      await fetchCities()
      console.log('Cities after fetch:', cities.length)
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
      const response = await fetch('/api/super-admin/delete-city', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cityId: city.id
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'שגיאה במחיקת העיר')
        return
      }

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
      const response = await fetch('/api/auth/super-admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
    } catch (error) {
      console.error('Error changing password:', error)
      alert('אירעה שגיאה בשינוי הסיסמה')
    } finally {
      setLoading(false)
    }
  }

  // Users Management Functions
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users/list', {
        credentials: 'include' // Important: send cookies for authentication
      })
      const data = await response.json()

      if (!response.ok) {
        console.error('Error fetching users:', data.error)
        return
      }

      setUsers(data.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  // Email Logs Functions
  const fetchEmailLogs = async () => {
    setEmailLogsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', '100')
      if (emailTypeFilter !== 'all') {
        params.set('type', emailTypeFilter)
      }
      if (emailSearchQuery) {
        params.set('search', emailSearchQuery)
      }

      const response = await fetch(`/api/admin/email-logs?${params.toString()}`, {
        credentials: 'include'
      })
      const data = await response.json()

      if (!response.ok) {
        console.error('Error fetching email logs:', data.error)
        return
      }

      setEmailLogs(data.logs || [])
    } catch (error) {
      console.error('Error fetching email logs:', error)
    } finally {
      setEmailLogsLoading(false)
    }
  }

  const handleDeleteEmailLog = async (logId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את רשומת המייל הזו?')) return

    try {
      const response = await fetch('/api/admin/email-logs/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ log_id: logId }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'שגיאה במחיקת רשומת המייל')
        return
      }

      alert('רשומת המייל נמחקה בהצלחה')
      fetchEmailLogs()
    } catch (error) {
      console.error('Error deleting email log:', error)
      alert('שגיאה במחיקת רשומת המייל')
    }
  }

  const toggleEmailExpand = (emailId: string) => {
    const newExpanded = new Set(expandedEmails)
    if (newExpanded.has(emailId)) {
      newExpanded.delete(emailId)
    } else {
      newExpanded.add(emailId)
    }
    setExpandedEmails(newExpanded)
  }

  const handleSendCustomEmail = async (e: React.FormEvent) => {
    e.preventDefault()

    const hasSelectedUsers = selectedUsersForEmail.size > 0
    if (!sendToAllUsers && !hasSelectedUsers && !customEmailTo) {
      alert('אנא בחר נמען או הזן כתובת מייל')
      return
    }

    if (!customEmailSubject || !customEmailMessage) {
      alert('אנא מלא את כל השדות (נושא, תוכן)')
      return
    }

    // Bulk send to all users
    if (sendToAllUsers) {
      if (!confirm(`האם אתה בטוח שברצונך לשלוח מייל לכל ${users.length} המשתמשים?`)) {
        return
      }

      setSendingCustomEmail(true)
      setBulkEmailProgress({ sent: 0, total: users.length, failed: 0 })

      let sent = 0
      let failed = 0

      for (const user of users) {
        try {
          const response = await fetch('/api/admin/send-custom-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              to: user.email,
              subject: customEmailSubject,
              message: customEmailMessage,
              recipientName: user.full_name || undefined
            }),
          })

          if (response.ok) {
            sent++
          } else {
            failed++
          }
        } catch {
          failed++
        }

        setBulkEmailProgress({ sent, total: users.length, failed })
      }

      alert(`שליחה הושלמה!\n✅ נשלחו בהצלחה: ${sent}\n❌ נכשלו: ${failed}`)

      // Reset form
      setCustomEmailTo('')
      setCustomEmailName('')
      setCustomEmailSubject('')
      setCustomEmailMessage('')
      setSendToAllUsers(false)
      setSelectedUsersForEmail(new Set())
      setBulkEmailProgress({ sent: 0, total: 0, failed: 0 })
      setShowCustomEmailForm(false)
      fetchEmailLogs()
      setSendingCustomEmail(false)
      return
    }

    // Bulk send to selected users
    if (hasSelectedUsers) {
      const selectedUsersList = users.filter(u => selectedUsersForEmail.has(u.id))
      if (!confirm(`האם אתה בטוח שברצונך לשלוח מייל ל-${selectedUsersList.length} משתמשים נבחרים?`)) {
        return
      }

      setSendingCustomEmail(true)
      setBulkEmailProgress({ sent: 0, total: selectedUsersList.length, failed: 0 })

      let sent = 0
      let failed = 0

      for (const user of selectedUsersList) {
        try {
          const response = await fetch('/api/admin/send-custom-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              to: user.email,
              subject: customEmailSubject,
              message: customEmailMessage,
              recipientName: user.full_name || undefined
            }),
          })

          if (response.ok) {
            sent++
          } else {
            failed++
          }
        } catch {
          failed++
        }

        setBulkEmailProgress({ sent, total: selectedUsersList.length, failed })
      }

      alert(`שליחה הושלמה!\n✅ נשלחו בהצלחה: ${sent}\n❌ נכשלו: ${failed}`)

      // Reset form
      setCustomEmailTo('')
      setCustomEmailName('')
      setCustomEmailSubject('')
      setCustomEmailMessage('')
      setSendToAllUsers(false)
      setSelectedUsersForEmail(new Set())
      setBulkEmailProgress({ sent: 0, total: 0, failed: 0 })
      setShowCustomEmailForm(false)
      fetchEmailLogs()
      setSendingCustomEmail(false)
      return
    }

    // Single email send
    setSendingCustomEmail(true)
    try {
      const response = await fetch('/api/admin/send-custom-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          to: customEmailTo,
          subject: customEmailSubject,
          message: customEmailMessage,
          recipientName: customEmailName || undefined
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'שגיאה בשליחת המייל')
        return
      }

      alert('המייל נשלח בהצלחה!')
      // Reset form
      setCustomEmailTo('')
      setCustomEmailName('')
      setCustomEmailSubject('')
      setCustomEmailMessage('')
      setShowCustomEmailForm(false)
      // Refresh email logs
      fetchEmailLogs()
    } catch (error) {
      console.error('Error sending custom email:', error)
      alert('שגיאה בשליחת המייל')
    } finally {
      setSendingCustomEmail(false)
    }
  }

  const toggleEmailSelection = (emailId: string) => {
    const newSelected = new Set(selectedEmails)
    if (newSelected.has(emailId)) {
      newSelected.delete(emailId)
    } else {
      newSelected.add(emailId)
    }
    setSelectedEmails(newSelected)
  }

  const toggleSelectAllEmails = () => {
    if (selectedEmails.size === emailLogs.length) {
      setSelectedEmails(new Set())
    } else {
      setSelectedEmails(new Set(emailLogs.map(log => log.id)))
    }
  }

  const handleDeleteSelectedEmails = async () => {
    if (selectedEmails.size === 0) return
    if (!confirm(`האם אתה בטוח שברצונך למחוק ${selectedEmails.size} מיילים?`)) return

    setDeletingSelectedEmails(true)
    try {
      // Delete each selected email
      const deletePromises = Array.from(selectedEmails).map(async (logId) => {
        const response = await fetch('/api/admin/email-logs/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ log_id: logId }),
        })
        return response.ok
      })

      await Promise.all(deletePromises)
      alert(`${selectedEmails.size} מיילים נמחקו בהצלחה`)
      setSelectedEmails(new Set())
      fetchEmailLogs()
    } catch (error) {
      console.error('Error deleting selected emails:', error)
      alert('שגיאה במחיקת המיילים')
    } finally {
      setDeletingSelectedEmails(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!userForm.email || !userForm.password || !userForm.full_name || !userForm.role) {
      alert('אנא מלא את כל השדות החובה (מייל, סיסמה, שם מלא, תפקיד)')
      return
    }

    if (userForm.role === 'city_manager' && !userForm.city_id) {
      alert('מנהל עיר חייב להיות משויך לעיר')
      return
    }

    if (userForm.password.length < 6) {
      alert('הסיסמה חייבת להכיל לפחות 6 תווים')
      return
    }

    setLoading(true)
    try {
      // Clean up empty strings to null for proper database constraints
      const cleanedForm = {
        ...userForm,
        phone: userForm.phone || null,
        manager_role: userForm.role === 'city_manager' ? (userForm.manager_role || null) : null,
        city_id: userForm.role === 'city_manager' ? userForm.city_id : null,
      }

      const response = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: send cookies for authentication
        body: JSON.stringify(cleanedForm),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'שגיאה ביצירת המשתמש')
        return
      }

      alert('המשתמש נוצר בהצלחה!')
      setUserForm({
        email: '',
        password: '',
        full_name: '',
        role: 'city_manager',
        city_id: '',
        permissions: 'full_access',
        phone: '',
        manager_role: '',
      })
      setShowAddUser(false)
      fetchUsers()
    } catch (error) {
      console.error('Error creating user:', error)
      alert('אירעה שגיאה ביצירת המשתמש')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingUser) return

    setLoading(true)
    try {
      // Check if user needs a city_id for city_manager role
      // This applies when: changing to city_manager OR already city_manager but has no cities
      const isCityManager = userForm.role === 'city_manager'
      const hasNoCities = !editingUser.city_id && (!editingUser.managed_cities || editingUser.managed_cities.length === 0)
      const needsCityId = isCityManager && hasNoCities

      if (needsCityId && !userForm.city_id) {
        alert('יש לבחור עיר עבור מנהל עיר')
        setLoading(false)
        return
      }

      const updateData: any = {
        user_id: editingUser.id,
        email: userForm.email,
        full_name: userForm.full_name,
        permissions: userForm.permissions,
        phone: userForm.phone || null,
        role: userForm.role,
      }

      // Include city_id when city_manager needs one
      if (needsCityId && userForm.city_id) {
        updateData.city_id = userForm.city_id
        updateData.manager_role = userForm.manager_role || 'manager1'
      }

      // Only include password if it was changed
      if (userForm.password) {
        if (userForm.password.length < 6) {
          alert('הסיסמה חייבת להכיל לפחות 6 תווים')
          setLoading(false)
          return
        }
        updateData.password = userForm.password
      }

      const response = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: send cookies for authentication
        body: JSON.stringify(updateData),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'שגיאה בעדכון המשתמש')
        return
      }

      alert('המשתמש עודכן בהצלחה!')
      setUserForm({
        email: '',
        password: '',
        full_name: '',
        role: 'city_manager',
        city_id: '',
        permissions: 'full_access',
        phone: '',
        manager_role: '',
      })
      setEditingUser(null)
      fetchUsers()
    } catch (error) {
      console.error('Error updating user:', error)
      alert('אירעה שגיאה בעדכון המשתמש')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (user: any) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את המשתמש ${user.full_name || user.email}?`)) return

    setLoading(true)
    try {
      const response = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: send cookies for authentication
        body: JSON.stringify({
          user_id: user.id
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'שגיאה במחיקת המשתמש')
        return
      }

      alert('המשתמש נמחק בהצלחה!')
      fetchUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('אירעה שגיאה במחיקת המשתמש')
    } finally {
      setLoading(false)
    }
  }

  const handleEditUser = (user: any) => {
    setEditingUser(user)

    // For city managers, get the first managed city
    let detectedCityId = ''
    let detectedManagerRole: '' | 'manager1' | 'manager2' = ''

    if (user.role === 'city_manager' && user.managed_cities && user.managed_cities.length > 0) {
      // Use the first managed city
      const firstCity = user.managed_cities[0]
      detectedCityId = firstCity.id
      detectedManagerRole = firstCity.role || ''
    } else if (user.role === 'city_manager' && user.city_id) {
      // Fallback: use city_id from user table if managed_cities is empty
      detectedCityId = user.city_id
      detectedManagerRole = user.manager_role || ''
    }

    console.log('📝 Editing user - FULL DATA:', {
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      role: user.role,
      permissions: user.permissions,
      managed_cities: user.managed_cities,
      city_id: user.city_id,
      manager_role: user.manager_role,
      detected: { city_id: detectedCityId, manager_role: detectedManagerRole }
    })

    const formData = {
      email: user.email,
      password: '', // Don't pre-fill password
      full_name: user.full_name,
      role: user.role,
      city_id: detectedCityId,
      permissions: user.permissions,
      phone: user.phone || '',
      manager_role: detectedManagerRole,
    }

    console.log('📋 Setting form with data:', formData)
    console.log('⚠️ PHONE VALUE:', user.phone, 'Type:', typeof user.phone, 'Will set as:', formData.phone)

    setUserForm(formData)

    // Scroll to the form
    setTimeout(() => {
      const formElement = document.querySelector('[data-edit-user-form]')
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  const filteredUsers = users
    .filter(user => {
      // Filter by role
      if (userFilter !== 'all' && user.role !== userFilter) return false

      // Filter by city
      if (userCityFilter !== 'all') {
        if (!user.city || user.city.id !== userCityFilter) {
          // Also check in managed_cities
          if (!user.managed_cities || !user.managed_cities.some((c: any) => c.id === userCityFilter)) {
            return false
          }
        }
      }

      // Filter by search query (name or email)
      if (userSearchQuery) {
        const query = userSearchQuery.toLowerCase()
        const matchesName = user.full_name?.toLowerCase().includes(query)
        const matchesEmail = user.email?.toLowerCase().includes(query)
        if (!matchesName && !matchesEmail) return false
      }

      return true
    })
    .sort((a, b) => {
      let compareA, compareB

      if (userSortBy === 'name') {
        compareA = a.full_name || ''
        compareB = b.full_name || ''
      } else if (userSortBy === 'email') {
        compareA = a.email || ''
        compareB = b.email || ''
      } else if (userSortBy === 'created_at') {
        compareA = a.created_at || ''
        compareB = b.created_at || ''
      }

      if (userSortOrder === 'asc') {
        return compareA.localeCompare(compareB, 'he')
      } else {
        return compareB.localeCompare(compareA, 'he')
      }
    })

  // Load users when switching to users tab
  useEffect(() => {
    if (isAuthenticated && activeTab === 'users') {
      fetchUsers()
    }
  }, [isAuthenticated, activeTab])

  // Load email logs when switching to emails tab
  useEffect(() => {
    if (isAuthenticated && activeTab === 'emails') {
      fetchEmailLogs()
    }
  }, [isAuthenticated, activeTab, emailTypeFilter, emailSearchQuery])

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

  // Redirect to unified login if not authenticated (only after check is complete)
  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      console.log('🔄 Not authenticated, redirecting to /login')
      window.location.href = '/login'
    }
    return (
      <div className="min-h-screen content-wrapper flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">מעביר לדף התחברות...</p>
        </div>
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

        {/* Tab Navigation - Sticky on scroll with safe area for mobile status bar */}
        <div className="sticky top-0 z-50 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 pt-safe md:px-8 mb-8 shadow-sm">
          {/* Mobile: Horizontal scrollable icons only */}
          <div className="md:hidden flex items-center justify-center gap-2 overflow-x-auto py-3 px-3 scrollbar-hide">
            <Button
              onClick={() => setActiveTab('cities')}
              className={`flex-shrink-0 w-12 h-12 p-2 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center ${
                activeTab === 'cities'
                  ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-300'
              }`}
            >
              <span className="text-xl leading-none">🏙️</span>
            </Button>
            <Button
              onClick={() => setActiveTab('users')}
              className={`flex-shrink-0 w-12 h-12 p-2 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center ${
                activeTab === 'users'
                  ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-300'
              }`}
            >
              <span className="text-xl leading-none">👥</span>
            </Button>
            <Button
              onClick={() => router.push('/super-admin/global-equipment')}
              className="flex-shrink-0 w-12 h-12 p-2 rounded-lg font-semibold transition-all duration-300 bg-white text-gray-600 border border-gray-300 flex items-center justify-center"
            >
              <span className="text-xl leading-none">📦</span>
            </Button>
            <Button
              onClick={() => setActiveTab('notifications')}
              className={`flex-shrink-0 w-12 h-12 p-2 rounded-lg font-semibold transition-all duration-300 relative flex items-center justify-center ${
                activeTab === 'notifications'
                  ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-300'
              }`}
            >
              <span className="text-xl leading-none">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>
            <Button
              onClick={() => setActiveTab('settings')}
              className={`flex-shrink-0 w-12 h-12 p-2 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center ${
                activeTab === 'settings'
                  ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-300'
              }`}
            >
              <span className="text-xl leading-none">⚙️</span>
            </Button>
            <Button
              onClick={() => setActiveTab('emails')}
              className={`flex-shrink-0 w-12 h-12 p-2 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center ${
                activeTab === 'emails'
                  ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-300'
              }`}
            >
              <span className="text-xl leading-none">📧</span>
            </Button>
          </div>

          {/* Desktop: Grid with text */}
          <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-6 gap-3">
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
              onClick={() => setActiveTab('users')}
              className={`py-6 rounded-xl font-semibold text-lg transition-all duration-300 ${
                activeTab === 'users'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50 scale-105'
                  : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
              }`}
            >
              <span className="text-2xl ml-2">👥</span> ניהול משתמשים
            </Button>
            <Button
              onClick={() => router.push('/super-admin/global-equipment')}
              className="py-6 rounded-xl font-semibold text-lg transition-all duration-300 bg-white text-gray-600 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50"
            >
              <span className="text-2xl ml-2">📦</span> מאגר ציוד
            </Button>
            <Button
              onClick={() => setActiveTab('notifications')}
              className={`py-6 rounded-xl font-semibold text-lg transition-all duration-300 relative ${
                activeTab === 'notifications'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50 scale-105'
                  : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
              }`}
            >
              <span className="text-2xl ml-2">🔔</span> התראות
              {unreadCount > 0 && (
                <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
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
            <Button
              onClick={() => setActiveTab('emails')}
              className={`py-6 rounded-xl font-semibold text-lg transition-all duration-300 ${
                activeTab === 'emails'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50 scale-105'
                  : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
              }`}
            >
              <span className="text-2xl ml-2">📧</span> מיילים
            </Button>
          </div>
        </div>

        {activeTab === 'cities' && (
          <>
            {/* Add City Button - Desktop */}
            <div className="mb-6 hidden md:block">
              <Button
                onClick={() => setShowAddCity(!showAddCity)}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {showAddCity ? '❌ ביטול' : '➕ הוספת עיר חדשה'}
              </Button>
            </div>

            {/* Add City FAB - Mobile */}
            <Button
              onClick={() => {
                setShowAddCity(!showAddCity)
                if (!showAddCity) {
                  // Scroll to form after it's rendered
                  setTimeout(() => {
                    addCityFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }, 100)
                }
              }}
              className="md:hidden fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center border-2 border-white"
            >
              {showAddCity ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              )}
            </Button>

        {/* Add City Form */}
        {showAddCity && (
          <Card ref={addCityFormRef} className="mb-8 border-0 shadow-xl rounded-lg overflow-hidden bg-white">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 py-4 px-4 md:px-6">
              <CardTitle className="text-lg md:text-xl font-bold text-gray-800">➕ הוספת עיר חדשה</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <form onSubmit={handleAddCity} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700">🏙️ שם העיר</label>
                    <Input
                      value={newCity.name}
                      onChange={(e) => setNewCity({ ...newCity, name: e.target.value })}
                      placeholder="לדוגמה: ירושלים"
                      className="h-11 rounded-md"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">👤 מנהל ראשון - שם</label>
                    <Input
                      value={newCity.manager1_name}
                      onChange={(e) => setNewCity({ ...newCity, manager1_name: e.target.value })}
                      placeholder="לדוגמה: יוסי כהן"
                      className="h-11 rounded-md"
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
                      className="h-11 rounded-md"
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700">📧 מנהל ראשון - מייל <span className="text-gray-400 text-xs">(ייצור משתמש אוטומטי)</span></label>
                    <Input
                      type="email"
                      value={newCity.manager1_email || ''}
                      onChange={(e) => setNewCity({ ...newCity, manager1_email: e.target.value })}
                      placeholder="manager1@example.com"
                      className="h-11 rounded-md"
                    />
                    <p className="text-xs text-green-600">אם תזין מייל, ייווצר משתמש חדש וסיסמה זמנית תישלח למייל</p>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">👤 מנהל שני - שם <span className="text-gray-400 text-xs">(אופציונלי)</span></label>
                    <Input
                      value={newCity.manager2_name}
                      onChange={(e) => setNewCity({ ...newCity, manager2_name: e.target.value })}
                      placeholder="לדוגמה: דוד לוי"
                      className="h-11 rounded-md"
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
                      className="h-11 rounded-md"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700">📧 מנהל שני - מייל <span className="text-gray-400 text-xs">(ייצור משתמש אוטומטי)</span></label>
                    <Input
                      type="email"
                      value={newCity.manager2_email || ''}
                      onChange={(e) => setNewCity({ ...newCity, manager2_email: e.target.value })}
                      placeholder="manager2@example.com"
                      className="h-11 rounded-md"
                    />
                    <p className="text-xs text-green-600">אם תזין מייל, ייווצר משתמש חדש וסיסמה זמנית תישלח למייל</p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700">📍 קישור למיקום הארון - דף ראשי <span className="text-gray-400 text-xs">(אופציונלי)</span></label>
                    <Input
                      type="url"
                      value={newCity.location_url}
                      onChange={(e) => setNewCity({ ...newCity, location_url: e.target.value })}
                      placeholder="https://maps.google.com/?q=31.7683,35.2137"
                      className="h-11 rounded-md"
                    />
                    <p className="text-xs text-gray-500">יוצג בדף הראשי לכל המשתמשים (השאר ריק להסתרה)</p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      🔐 קישור למיקום הארון - טוקן בלבד <span className="text-gray-400 text-xs">(אופציונלי)</span>
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
                      value={newCity.token_location_url || ''}
                      onChange={(e) => setNewCity({ ...newCity, token_location_url: e.target.value })}
                      placeholder="https://maps.google.com/?q=31.7683,35.2137"
                      className="h-12 border-purple-200 focus:border-purple-500"
                    />
                    <p className="text-xs text-purple-600">יוצג רק בדף הטוקן לאחר אישור בקשה</p>
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
            <CardTitle className="text-2xl font-bold text-gray-800">🏙️ רשימת ערים ({filteredCities.length})</CardTitle>
            <CardDescription className="text-gray-600">ניהול כל הערים במערכת</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {/* Search Input */}
            <div className="mb-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="🔍 חיפוש לפי שם עיר, מנהל או טלפון..."
                  value={citySearchQuery}
                  onChange={(e) => setCitySearchQuery(e.target.value)}
                  className="h-12 pr-4 pl-10 text-base"
                />
                {citySearchQuery && (
                  <button
                    onClick={() => setCitySearchQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-1 sm:gap-2 mb-6">
              <Button
                onClick={() => setCityFilter('all')}
                className={`flex-1 text-xs sm:text-sm px-1 sm:px-3 h-9 sm:h-10 ${cityFilter === 'all' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' : 'bg-white text-gray-600 border-2 border-gray-200'}`}
              >
                <span className="hidden sm:inline">הכל ({cities.length})</span>
                <span className="sm:hidden">הכל</span>
              </Button>
              <Button
                onClick={() => setCityFilter('active')}
                className={`flex-1 text-xs sm:text-sm px-1 sm:px-3 h-9 sm:h-10 ${cityFilter === 'active' ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' : 'bg-white text-gray-600 border-2 border-gray-200'}`}
              >
                <span className="hidden sm:inline">🟢 פעילות ({cities.filter(c => c.is_active).length})</span>
                <span className="sm:hidden">🟢 פעילות</span>
              </Button>
              <Button
                onClick={() => setCityFilter('inactive')}
                className={`flex-1 text-xs sm:text-sm px-1 sm:px-3 h-9 sm:h-10 ${cityFilter === 'inactive' ? 'bg-gradient-to-r from-gray-600 to-slate-600 text-white' : 'bg-white text-gray-600 border-2 border-gray-200'}`}
              >
                <span className="hidden sm:inline">🔴 מושבתות ({cities.filter(c => !c.is_active).length})</span>
                <span className="sm:hidden">🔴 מושבתות</span>
              </Button>
            </div>

            <div className="space-y-3">
              {filteredCities.map(city => (
                <div key={city.id} className={`${expandedCities.has(city.id) ? 'p-4' : 'p-3'} rounded-xl border-2 transition-all ${city.is_active ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200' : 'bg-gray-100 border-gray-300'}`}>
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
                      {/* Compact View Header - Always visible */}
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3 flex-1">
                          <button
                            onClick={() => toggleCityExpansion(city.id)}
                            className="text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            {expandedCities.has(city.id) ? '▼' : '◀'}
                          </button>
                          <h3 className="text-lg font-bold text-gray-800">🏙️ {city.name}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`px-3 py-1 rounded-lg text-sm font-bold ${city.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                            {city.is_active ? '✅ פעילה' : '❌ מושבתת'}
                          </div>
                          <Button
                            onClick={() => toggleCityExpansion(city.id)}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                          >
                            {expandedCities.has(city.id) ? 'צמצם' : 'הרחב'}
                          </Button>
                        </div>
                      </div>

                      {/* Expanded View - Only shown when expanded */}
                      {expandedCities.has(city.id) && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="space-y-2 mb-4">
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
                          <p className="text-sm text-gray-500 mb-4">🔐 סיסמה: ••••••</p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              onClick={() => router.push(`/city/${city.id}/admin`)}
                              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-xs sm:text-sm px-2 sm:px-4 h-9 sm:h-10 flex-shrink-0"
                            >
                              🚪 ניהול
                            </Button>
                            {currentUser?.permissions !== 'view_only' && (
                              <>
                                <Button
                                  onClick={() => setEditingCity(city)}
                                  className="bg-blue-500 hover:bg-blue-600 text-xs sm:text-sm px-2 sm:px-4 h-9 sm:h-10 flex-shrink-0"
                                >
                                  ✏️ ערוך
                                </Button>
                                <Button
                                  onClick={async () => {
                                    const newPassword = prompt('הזן סיסמה חדשה לעיר (השאר ריק עבור 123456):') ?? '123456'

                                    if (newPassword.length < 4) {
                                      alert('הסיסמה חייבת להכיל לפחות 4 תווים')
                                      return
                                    }

                                    if (!confirm(`האם לאפס את הסיסמה של העיר ${city.name}?\nסיסמה חדשה: ${newPassword}`)) return

                                    setLoading(true)
                                    try {
                                      const response = await fetch('/api/admin/cities/reset-password', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        credentials: 'include',
                                        body: JSON.stringify({
                                          city_id: city.id,
                                          new_password: newPassword
                                        }),
                                      })

                                      const data = await response.json()

                                      if (!response.ok) {
                                        alert(data.error || 'שגיאה באיפוס סיסמה')
                                        return
                                      }

                                      alert(data.message)
                                    } catch (error) {
                                      console.error('Error resetting city password:', error)
                                      alert('אירעה שגיאה באיפוס הסיסמה')
                                    } finally {
                                      setLoading(false)
                                    }
                                  }}
                                  disabled={loading}
                                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-xs sm:text-sm px-2 sm:px-4 h-9 sm:h-10 flex-shrink-0"
                                >
                                  🔑 סיסמה
                                </Button>
                                <Button
                                  onClick={() => handleToggleActive(city)}
                                  disabled={loading}
                                  className={`text-xs sm:text-sm px-2 sm:px-4 h-9 sm:h-10 flex-shrink-0 ${city.is_active ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'}`}
                                >
                                  {city.is_active ? '🔴 השבת' : '🟢 הפעל'}
                                </Button>
                                <Button
                                  onClick={() => handleDeleteCity(city)}
                                  disabled={loading}
                                  className="bg-red-500 hover:bg-red-600 text-xs sm:text-sm px-2 sm:px-4 h-9 sm:h-10 flex-shrink-0"
                                >
                                  🗑️ מחק
                                </Button>
                              </>
                            )}
                            {currentUser?.permissions === 'view_only' && (
                              <span className="text-sm text-gray-500 italic">צפייה בלבד</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
          </>
        )}

        {activeTab === 'notifications' && (
          <Card className="border-0 shadow-2xl rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-800">🔔 התראות מערכת</CardTitle>
                  <CardDescription className="text-gray-600">התראות על שינויים בערים במערכת</CardDescription>
                </div>
                {notifications.length > 0 && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    {unreadCount > 0 && (
                      <Button
                        onClick={markAllAsRead}
                        size="sm"
                        className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 text-xs sm:text-sm"
                      >
                        ✅ סמן הכל כנקרא
                      </Button>
                    )}
                    <Button
                      onClick={deleteAllNotifications}
                      size="sm"
                      variant="destructive"
                      className="flex-1 sm:flex-none bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 text-xs sm:text-sm"
                    >
                      🗑️ מחק הכל
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {notifications.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <p className="text-xl text-gray-500">📭 אין התראות</p>
                  <p className="text-gray-400 text-sm mt-2">התראות על שינויים יופיעו כאן</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`flex items-start justify-between p-5 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
                        notification.is_read
                          ? 'bg-white border-gray-200'
                          : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {!notification.is_read && (
                            <span className="bg-blue-500 h-2 w-2 rounded-full"></span>
                          )}
                          <h3 className="font-bold text-lg text-gray-800">{notification.city_name}</h3>
                        </div>
                        <p className="text-gray-700 mb-2">{notification.message}</p>
                        <p className="text-sm text-gray-500">
                          🕐 {new Date(notification.created_at).toLocaleString('he-IL', {
                            dateStyle: 'short',
                            timeStyle: 'short'
                          })}
                        </p>
                      </div>
                      <div className="flex gap-2 mr-3">
                        {!notification.is_read && (
                          <Button
                            onClick={() => markAsRead(notification.id)}
                            size="icon"
                            className="h-10 w-10 bg-blue-500 hover:bg-blue-600 rounded-full"
                            title="סמן כנקרא"
                          >
                            ✓
                          </Button>
                        )}
                        <Button
                          onClick={() => {
                            if (confirm('האם למחוק התראה זו?')) {
                              deleteNotification(notification.id)
                            }
                          }}
                          size="icon"
                          className="h-10 w-10 bg-red-500 hover:bg-red-600 rounded-full"
                          title="מחק התראה"
                        >
                          🗑️
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
                        <h3 className="text-lg font-bold text-gray-800 mb-1">🔐 סיסמת מנהל ראשי</h3>
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
                      <CardTitle className="text-xl font-bold text-gray-800">שינוי סיסמת מנהל ראשי</CardTitle>
                      <CardDescription>הזן את הסיסמה הנוכחית והסיסמה החדשה</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleChangePassword} className="space-y-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">🔑 סיסמה נוכחית</label>
                          <div className="relative">
                            <Input
                              type={showChangePasswordCurrent ? "text" : "password"}
                              value={changePasswordForm.currentPassword}
                              onChange={(e) => setChangePasswordForm({ ...changePasswordForm, currentPassword: e.target.value })}
                              placeholder="הזן סיסמה נוכחית"
                              className="h-12 border-2 border-gray-200 rounded-xl focus:border-purple-500 transition-colors pr-12"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowChangePasswordCurrent(!showChangePasswordCurrent)}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                              tabIndex={-1}
                            >
                              {showChangePasswordCurrent ? '👁️' : '👁️‍🗨️'}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">🆕 סיסמה חדשה</label>
                          <div className="relative">
                            <Input
                              type={showChangePasswordNew ? "text" : "password"}
                              value={changePasswordForm.newPassword}
                              onChange={(e) => setChangePasswordForm({ ...changePasswordForm, newPassword: e.target.value })}
                              placeholder="הזן סיסמה חדשה"
                              className="h-12 border-2 border-gray-200 rounded-xl focus:border-purple-500 transition-colors pr-12"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowChangePasswordNew(!showChangePasswordNew)}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                              tabIndex={-1}
                            >
                              {showChangePasswordNew ? '👁️' : '👁️‍🗨️'}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">✅ אימות סיסמה חדשה</label>
                          <div className="relative">
                            <Input
                              type={showChangePasswordConfirm ? "text" : "password"}
                              value={changePasswordForm.confirmPassword}
                              onChange={(e) => setChangePasswordForm({ ...changePasswordForm, confirmPassword: e.target.value })}
                              placeholder="הזן שוב את הסיסמה החדשה"
                              className="h-12 border-2 border-gray-200 rounded-xl focus:border-purple-500 transition-colors pr-12"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowChangePasswordConfirm(!showChangePasswordConfirm)}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                              tabIndex={-1}
                            >
                              {showChangePasswordConfirm ? '👁️' : '👁️‍🗨️'}
                            </button>
                          </div>
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
                      <h3 className="font-bold text-gray-800 mb-2">הערות חשובות</h3>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• ודא שהסיסמה מכילה לפחות 4 תווים</li>
                        <li>• שמור את הסיסמה במקום בטוח</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'users' && (
          <>
            {/* Add User Button & Filters */}
            <div className="mb-6 space-y-4">
              {/* Top row: Add button and count */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                {/* Add User Button - Desktop */}
                <Button
                  onClick={() => {
                    setShowAddUser(!showAddUser)
                    setEditingUser(null)
                    setUserForm({
                      email: '',
                      password: '',
                      full_name: '',
                      role: 'city_manager',
                      city_id: '',
                      permissions: 'full_access',
                      phone: '',
                      manager_role: '',
                    })
                  }}
                  className="hidden md:flex bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {showAddUser ? '❌ ביטול' : '➕ הוספת משתמש חדש'}
                </Button>

                {/* Add User FAB - Mobile */}
                <Button
                  onClick={() => {
                    setShowAddUser(!showAddUser)
                    setEditingUser(null)
                    setUserForm({
                      email: '',
                      password: '',
                      full_name: '',
                      role: 'city_manager',
                      city_id: '',
                      permissions: 'full_access',
                      phone: '',
                      manager_role: '',
                    })
                    if (!showAddUser) {
                      // Scroll to form after it's rendered
                      setTimeout(() => {
                        addUserFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }, 100)
                    }
                  }}
                  className="md:hidden fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center border-2 border-white"
                >
                  {showAddUser ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                </Button>

                {/* User count */}
                <div className="px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
                  <span className="text-gray-700 font-semibold">
                    מציג: <span className="text-purple-600">{filteredUsers.length}</span> מתוך <span className="text-purple-600">{users.length}</span>
                  </span>
                </div>
              </div>

              {/* Filters row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Search filter */}
                <Input
                  placeholder="🔍 חיפוש לפי שם או מייל..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="h-10 border-2 border-gray-200 rounded-lg"
                />

                {/* City filter */}
                <select
                  value={userCityFilter}
                  onChange={(e) => setUserCityFilter(e.target.value)}
                  className="h-10 border-2 border-gray-200 rounded-lg px-3 bg-white"
                >
                  <option value="all">🏙️ כל הערים</option>
                  {cities.map(city => (
                    <option key={city.id} value={city.id}>{city.name}</option>
                  ))}
                </select>

                {/* Sort by filter */}
                <select
                  value={userSortBy}
                  onChange={(e) => setUserSortBy(e.target.value as any)}
                  className="h-10 border-2 border-gray-200 rounded-lg px-3 bg-white"
                >
                  <option value="name">📝 מיון לפי שם</option>
                  <option value="email">📧 מיון לפי מייל</option>
                  <option value="created_at">📅 מיון לפי תאריך יצירה</option>
                </select>

                {/* Sort order */}
                <Button
                  onClick={() => setUserSortOrder(userSortOrder === 'asc' ? 'desc' : 'asc')}
                  variant="outline"
                  className="h-10 border-2 border-gray-200"
                >
                  {userSortOrder === 'asc' ? '⬆️ עולה (א-ת)' : '⬇️ יורד (ת-א)'}
                </Button>
              </div>
            </div>

            {/* Add/Edit User Form */}
            {(showAddUser || editingUser) && (
              <Card ref={addUserFormRef} className="mb-6 border-0 shadow-xl rounded-lg bg-gradient-to-r from-purple-50 to-pink-50" data-edit-user-form>
                <CardHeader className="py-4 px-4 md:px-6">
                  <CardTitle className="text-lg md:text-xl font-bold text-gray-800">
                    {editingUser ? '✏️ עריכת משתמש' : '➕ הוספת משתמש חדש'}
                  </CardTitle>
                  <CardDescription>
                    {editingUser ? 'ערוך את פרטי המשתמש' : 'מלא את כל הפרטים ליצירת משתמש חדש'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                  <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">👤 שם מלא</label>
                        <Input
                          type="text"
                          value={userForm.full_name}
                          onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                          placeholder="שם מלא"
                          className="h-11 rounded-md"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          📧 כתובת מייל {editingUser && '(ניתן לשנות)'}
                        </label>
                        <Input
                          type="email"
                          value={userForm.email}
                          onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                          placeholder="email@example.com"
                          className="h-11 rounded-md"
                          required
                        />
                        {editingUser && (
                          <p className="text-xs text-amber-600">
                            ⚠️ שינוי המייל ישנה את המייל שבו המשתמש מתחבר למערכת
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          🔐 סיסמה {editingUser && '(השאר ריק אם לא רוצה לשנות)'}
                        </label>
                        <div className="relative">
                          <Input
                            type={showUserFormPassword ? "text" : "password"}
                            value={userForm.password}
                            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                            placeholder={editingUser ? 'סיסמה חדשה (אופציונלי)' : 'סיסמה (לפחות 6 תווים)'}
                            className="h-12 border-2 border-gray-200 rounded-xl focus:border-purple-500 transition-colors pr-12"
                            required={!editingUser}
                          />
                          <button
                            type="button"
                            onClick={() => setShowUserFormPassword(!showUserFormPassword)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                            tabIndex={-1}
                          >
                            {showUserFormPassword ? '👁️' : '👁️‍🗨️'}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">📱 טלפון</label>
                        <Input
                          type="tel"
                          value={userForm.phone}
                          onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                          placeholder="05xxxxxxxx"
                          className="h-11 rounded-md"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">👔 תפקיד {editingUser && '(ניתן לשנות)'}</label>
                        <select
                          value={userForm.role}
                          onChange={(e) => setUserForm({ ...userForm, role: e.target.value as 'city_manager' | 'super_admin' })}
                          className="w-full h-12 border-2 border-gray-200 rounded-xl focus:border-purple-500 transition-colors px-3"
                          required
                        >
                          <option value="city_manager">מנהל עיר</option>
                          <option value="super_admin">מנהל ראשי</option>
                        </select>
                      </div>

                      {userForm.role === 'city_manager' && (
                        <>
                          {editingUser ? (
                            /* For existing users - show managed cities list with add/remove */
                            <div className="space-y-3">
                              <label className="block text-sm font-semibold text-gray-700">🏙️ ערים מנוהלות</label>

                              {/* When user has no cities - must select first city */}
                              {(!editingUser.managed_cities || editingUser.managed_cities.length === 0) && !editingUser.city_id && (
                                <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl space-y-3">
                                  <p className="text-sm font-semibold text-yellow-800">⚠️ יש לבחור עיר ראשונה עבור המנהל</p>
                                  <div className="grid grid-cols-2 gap-3">
                                    <select
                                      value={userForm.city_id}
                                      onChange={(e) => setUserForm({ ...userForm, city_id: e.target.value })}
                                      className="h-10 border-2 border-gray-200 rounded-lg px-3"
                                      required
                                    >
                                      <option value="">בחר עיר</option>
                                      {cities.map(city => (
                                        <option key={city.id} value={city.id}>{city.name}</option>
                                      ))}
                                    </select>
                                    <select
                                      value={userForm.manager_role}
                                      onChange={(e) => setUserForm({ ...userForm, manager_role: e.target.value as any })}
                                      className="h-10 border-2 border-gray-200 rounded-lg px-3"
                                      required
                                    >
                                      <option value="">תפקיד</option>
                                      <option value="manager1">מנהל ראשון</option>
                                      <option value="manager2">מנהל שני</option>
                                    </select>
                                  </div>
                                </div>
                              )}

                              {/* List of managed cities */}
                              {editingUser.managed_cities && editingUser.managed_cities.length > 0 ? (
                                <div className="space-y-2">
                                  {editingUser.managed_cities.map((city: any) => (
                                    <div key={city.id} className="flex items-center justify-between p-3 bg-blue-50 border-2 border-blue-200 rounded-xl">
                                      <div className="flex items-center gap-2">
                                        <span className="text-lg">🏙️</span>
                                        <div>
                                          <span className="font-semibold text-gray-800">{city.name}</span>
                                          <span className="text-xs text-gray-600 mr-2">
                                            ({city.role === 'manager1' ? 'מנהל ראשון' : 'מנהל שני'})
                                          </span>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (!confirm(`האם אתה בטוח שברצונך להסיר את ${editingUser.full_name} מהעיר ${city.name}?`)) return

                                          setLoading(true)
                                          try {
                                            const res = await fetch('/api/admin/users/manage-cities', {
                                              method: 'POST',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({
                                                user_id: editingUser.id,
                                                city_id: city.id,
                                                action: 'remove'
                                              })
                                            })

                                            const data = await res.json()
                                            if (data.success) {
                                              alert('✅ העיר הוסרה בהצלחה')
                                              await fetchUsers()
                                              // Refresh the editing user to show updated cities
                                              const res2 = await fetch('/api/admin/users/list')
                                              const data2 = await res2.json()
                                              if (data2.success) {
                                                const updatedUser = data2.users.find((u: any) => u.id === editingUser.id)
                                                if (updatedUser) {
                                                  setEditingUser(updatedUser)
                                                }
                                              }
                                            } else {
                                              alert('❌ ' + (data.error || 'שגיאה בהסרת עיר'))
                                            }
                                          } catch (err) {
                                            alert('❌ שגיאה בהסרת עיר')
                                          }
                                          setLoading(false)
                                        }}
                                        className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                                      >
                                        ❌ הסר
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500 p-3 bg-gray-50 rounded-xl">אין ערים מנוהלות</p>
                              )}

                              {/* Add new city */}
                              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl space-y-3">
                                <p className="text-sm font-semibold text-gray-700">➕ הוסף עיר חדשה</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <select
                                    value={userForm.city_id}
                                    onChange={(e) => setUserForm({ ...userForm, city_id: e.target.value })}
                                    className="h-10 border-2 border-gray-200 rounded-lg px-3"
                                  >
                                    <option value="">בחר עיר</option>
                                    {cities.map(city => (
                                      <option key={city.id} value={city.id}>{city.name}</option>
                                    ))}
                                  </select>
                                  <select
                                    value={userForm.manager_role}
                                    onChange={(e) => setUserForm({ ...userForm, manager_role: e.target.value as any })}
                                    className="h-10 border-2 border-gray-200 rounded-lg px-3"
                                  >
                                    <option value="">תפקיד</option>
                                    <option value="manager1">מנהל ראשון</option>
                                    <option value="manager2">מנהל שני</option>
                                  </select>
                                </div>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!userForm.city_id || !userForm.manager_role) {
                                      alert('נא לבחור עיר ותפקיד')
                                      return
                                    }

                                    setLoading(true)
                                    try {
                                      const res = await fetch('/api/admin/users/manage-cities', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          user_id: editingUser.id,
                                          city_id: userForm.city_id,
                                          manager_role: userForm.manager_role,
                                          action: 'add'
                                        })
                                      })

                                      const data = await res.json()
                                      if (data.success) {
                                        alert('✅ העיר נוספה בהצלחה')
                                        setUserForm({ ...userForm, city_id: '', manager_role: '' })
                                        await fetchUsers()
                                        // Refresh the editing user to show updated cities
                                        const res2 = await fetch('/api/admin/users/list')
                                        const data2 = await res2.json()
                                        if (data2.success) {
                                          const updatedUser = data2.users.find((u: any) => u.id === editingUser.id)
                                          if (updatedUser) {
                                            setEditingUser(updatedUser)
                                          }
                                        }
                                      } else {
                                        alert('❌ ' + (data.error || 'שגיאה בהוספת עיר'))
                                      }
                                    } catch (err) {
                                      alert('❌ שגיאה בהוספת עיר')
                                    }
                                    setLoading(false)
                                  }}
                                  className="w-full h-10 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                                >
                                  ➕ הוסף עיר
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* For new users - show simple city selector */
                            <>
                              <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">🏙️ עיר</label>
                                <select
                                  value={userForm.city_id}
                                  onChange={(e) => setUserForm({ ...userForm, city_id: e.target.value })}
                                  className="w-full h-12 border-2 border-gray-200 rounded-xl focus:border-purple-500 transition-colors px-3"
                                  required
                                >
                                  <option value="">בחר עיר</option>
                                  {cities.map(city => (
                                    <option key={city.id} value={city.id}>{city.name}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">👔 תפקיד מנהל</label>
                                <select
                                  value={userForm.manager_role}
                                  onChange={(e) => setUserForm({ ...userForm, manager_role: e.target.value as any })}
                                  className="w-full h-12 border-2 border-gray-200 rounded-xl focus:border-purple-500 transition-colors px-3"
                                  required
                                >
                                  <option value="">בחר תפקיד מנהל</option>
                                  <option value="manager1">מנהל ראשון</option>
                                  <option value="manager2">מנהל שני</option>
                                </select>
                                <p className="text-xs text-gray-500">
                                  כל עיר יכולה להיות עם עד 2 מנהלים - מנהל ראשון ומנהל שני
                                </p>
                              </div>
                            </>
                          )}
                        </>
                      )}

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">🔑 הרשאות</label>
                        <select
                          value={userForm.permissions}
                          onChange={(e) => setUserForm({ ...userForm, permissions: e.target.value as any })}
                          className="w-full h-12 border-2 border-gray-200 rounded-xl focus:border-purple-500 transition-colors px-3"
                          required
                        >
                          <option value="view_only">צפיה בלבד</option>
                          <option value="approve_requests">אישור בקשות</option>
                          <option value="full_access">גישה מלאה</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="submit"
                        disabled={loading}
                        className="flex-1 h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                      >
                        {loading ? '⏳ שומר...' : editingUser ? '✅ עדכן משתמש' : '✅ צור משתמש'}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setShowAddUser(false)
                          setEditingUser(null)
                          setUserForm({
                            email: '',
                            password: '',
                            full_name: '',
                            role: 'city_manager',
                            city_id: '',
                            permissions: 'full_access',
                            phone: '',
                            manager_role: '',
                          })
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

            {/* Users List */}
            <Card className="border-0 shadow-2xl rounded-2xl overflow-hidden bg-white">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 pb-6">
                <CardTitle className="text-2xl font-bold text-gray-800">👥 רשימת משתמשים</CardTitle>
                <CardDescription className="text-gray-600">
                  ניהול משתמשים, תפקידים והרשאות
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <span className="text-6xl mb-4 block">👥</span>
                    <p className="text-gray-500 text-lg">אין משתמשים להצגה</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 md:p-6 border-2 border-purple-200 hover:shadow-lg transition-all duration-200"
                      >
                        <div className="flex flex-col gap-3">
                          {/* Header - Always visible */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-xl md:text-2xl flex-shrink-0">
                                {user.role === 'super_admin' ? '👑' : '👤'}
                              </span>
                              <div className="min-w-0 flex-1">
                                <h3 className="text-base md:text-xl font-bold text-gray-800 truncate">{user.full_name}</h3>
                                <p className="text-xs md:text-sm text-gray-600 truncate">{user.email}</p>
                              </div>
                            </div>
                            {!user.is_active && (
                              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded flex-shrink-0">מושבת</span>
                            )}
                          </div>

                          {/* Info - Compact on mobile, full on desktop */}
                          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-2">
                            <div className="text-sm">
                              <span className="font-semibold text-gray-700">תפקיד:</span>{' '}
                              <span className="text-purple-600">
                                {user.role === 'super_admin' ? 'מנהל ראשי' : 'מנהל עיר'}
                              </span>
                            </div>

                            {user.managed_cities && user.managed_cities.length > 0 && (
                              <div className="text-sm">
                                <span className="font-semibold text-gray-700">ערים מנוהלות:</span>{' '}
                                <span className="text-purple-600">
                                  {user.managed_cities.map((c: any) => c.name).join(', ')}
                                </span>
                              </div>
                            )}

                            <div className="text-sm">
                              <span className="font-semibold text-gray-700">הרשאות:</span>{' '}
                              <span className="text-purple-600">
                                {user.permissions === 'view_only' && 'צפיה בלבד'}
                                {user.permissions === 'approve_requests' && 'אישור בקשות'}
                                {user.permissions === 'full_access' && 'גישה מלאה'}
                              </span>
                            </div>

                            {user.phone && (
                              <div className="text-sm">
                                <span className="font-semibold text-gray-700">טלפון:</span>{' '}
                                <span className="text-purple-600">{user.phone}</span>
                              </div>
                            )}
                          </div>

                          {/* Mobile compact info */}
                          <div className="md:hidden flex flex-wrap gap-2 text-xs">
                            {user.managed_cities && user.managed_cities.length > 0 && (
                              <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                🏙️ {user.managed_cities.map((c: any) => c.name).join(', ')}
                              </span>
                            )}
                            {user.phone && (
                              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                📱 {user.phone}
                              </span>
                            )}
                          </div>

                          {/* Action buttons - Compact on mobile */}
                          <div className="flex gap-1.5 md:gap-2 flex-wrap w-full">
                            <Button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleEditUser(user)
                                setShowAddUser(false)
                              }}
                              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold text-xs md:text-sm px-2 md:px-4 py-1.5 md:py-2 rounded-lg transition-all duration-200 hover:scale-105 flex-1 md:flex-none"
                            >
                              <span className="md:hidden">✏️</span>
                              <span className="hidden md:inline">✏️ ערוך</span>
                            </Button>
                            <Button
                              type="button"
                              onClick={async (e) => {
                                e.preventDefault()
                                e.stopPropagation()

                                const action = user.is_active ? 'לחסום' : 'להפעיל'
                                if (!confirm(`האם ${action} את המשתמש ${user.full_name}?`)) return

                                setLoading(true)
                                try {
                                  const response = await fetch('/api/admin/users/update', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    credentials: 'include',
                                    body: JSON.stringify({
                                      user_id: user.id,
                                      is_active: !user.is_active
                                    }),
                                  })

                                  const data = await response.json()

                                  if (!response.ok) {
                                    alert(data.error || 'שגיאה בעדכון משתמש')
                                    return
                                  }

                                  alert(`המשתמש ${user.is_active ? 'נחסם' : 'הופעל'} בהצלחה`)
                                  fetchUsers()
                                } catch (error) {
                                  console.error('Error updating user:', error)
                                  alert('אירעה שגיאה בעדכון המשתמש')
                                } finally {
                                  setLoading(false)
                                }
                              }}
                              className={`${user.is_active
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                                : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                              } text-white font-semibold text-xs md:text-sm px-2 md:px-4 py-1.5 md:py-2 rounded-lg transition-all duration-200 hover:scale-105 flex-1 md:flex-none`}
                            >
                              <span className="md:hidden">{user.is_active ? '🚫' : '✅'}</span>
                              <span className="hidden md:inline">{user.is_active ? '🚫 חסום' : '✅ הפעל'}</span>
                            </Button>
                            <Button
                              type="button"
                              onClick={async (e) => {
                                e.preventDefault()
                                e.stopPropagation()

                                if (!confirm(`האם לשלוח לינק לאיפוס סיסמה למייל ${user.email}?`)) return

                                setLoading(true)
                                try {
                                  const response = await fetch('/api/admin/users/send-reset-email', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    credentials: 'include',
                                    body: JSON.stringify({
                                      email: user.email
                                    }),
                                  })

                                  const data = await response.json()

                                  if (!response.ok) {
                                    alert(data.error || 'שגיאה בשליחת מייל')
                                    return
                                  }

                                  alert(data.message)
                                } catch (error) {
                                  console.error('Error sending reset email:', error)
                                  alert('אירעה שגיאה בשליחת המייל')
                                } finally {
                                  setLoading(false)
                                }
                              }}
                              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-xs md:text-sm px-2 md:px-4 py-1.5 md:py-2 rounded-lg transition-all duration-200 hover:scale-105 flex-1 md:flex-none"
                            >
                              <span className="md:hidden">📧</span>
                              <span className="hidden md:inline">📧 שלח לינק</span>
                            </Button>
                            <Button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleDeleteUser(user)
                              }}
                              className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-semibold text-xs md:text-sm px-2 md:px-4 py-1.5 md:py-2 rounded-lg transition-all duration-200 hover:scale-105 flex-1 md:flex-none"
                            >
                              <span className="md:hidden">🗑️</span>
                              <span className="hidden md:inline">🗑️ מחק</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Email Logs Tab */}
        {activeTab === 'emails' && (
          <>
            <Card className="bg-white rounded-2xl shadow-xl border-2 border-purple-100">
              <CardHeader className="border-b border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-2xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <CardTitle className="text-2xl text-gray-800 flex items-center gap-2">
                      <span>📧</span> מעקב מיילים שנשלחו
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">צפייה בכל המיילים שנשלחו מהמערכת</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <Input
                      placeholder="חיפוש לפי מייל או שם..."
                      value={emailSearchQuery}
                      onChange={(e) => setEmailSearchQuery(e.target.value)}
                      className="min-w-[200px]"
                    />
                    <select
                      value={emailTypeFilter}
                      onChange={(e) => setEmailTypeFilter(e.target.value)}
                      className="h-10 border-2 border-gray-200 rounded-lg px-3 bg-white"
                    >
                      <option value="all">כל הסוגים</option>
                      <option value="password_reset">איפוס סיסמה</option>
                      <option value="welcome">ברוך הבא</option>
                      <option value="email_update">עדכון מייל</option>
                    </select>
                    <Button
                      onClick={fetchEmailLogs}
                      variant="outline"
                      className="border-purple-300"
                    >
                      🔄 רענון
                    </Button>
                    <Button
                      onClick={() => setShowCustomEmailForm(!showCustomEmailForm)}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    >
                      ✉️ שלח מייל חדש
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {/* Custom Email Form */}
                {showCustomEmailForm && (
                  <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span>✉️</span> שליחת מייל חדש
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSendCustomEmail} className="space-y-4">
                        {/* Recipient Selection */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            בחר נמענים
                          </label>

                          {/* Quick Selection Buttons - Same Row */}
                          <div className="flex items-center gap-2 mb-3">
                            <Button
                              type="button"
                              size="sm"
                              variant={selectedUsersForEmail.size > 0 && !sendToAllUsers ? "default" : "outline"}
                              onClick={() => {
                                setShowUserSelector(!showUserSelector)
                                setSendToAllUsers(false)
                              }}
                              className={selectedUsersForEmail.size > 0 && !sendToAllUsers ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                            >
                              👥 בחר משתמשים {selectedUsersForEmail.size > 0 && `(${selectedUsersForEmail.size})`}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={sendToAllUsers ? "default" : "outline"}
                              onClick={() => {
                                setSendToAllUsers(!sendToAllUsers)
                                if (!sendToAllUsers) {
                                  setSelectedUsersForEmail(new Set())
                                  setCustomEmailTo('')
                                  setCustomEmailName('')
                                  setShowUserSelector(false)
                                }
                              }}
                              className={`text-xs ${sendToAllUsers ? "bg-purple-600 hover:bg-purple-700" : ""}`}
                            >
                              📧 כולם ({users.length})
                            </Button>
                          </div>

                          {/* User Selector Panel */}
                          {showUserSelector && !sendToAllUsers && (
                            <div className="bg-white border-2 border-indigo-200 rounded-lg p-3 mb-3">
                              {/* Header with count and actions */}
                              <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
                                <span className="text-sm font-medium text-gray-700">
                                  {selectedUsersForEmail.size} נבחרו
                                </span>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      const filteredUsers = users.filter(u =>
                                        u.full_name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                                        u.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
                                      )
                                      setSelectedUsersForEmail(new Set(filteredUsers.map(u => u.id)))
                                    }}
                                    className="text-xs h-7 px-2"
                                  >
                                    בחר הכל
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setSelectedUsersForEmail(new Set())}
                                    className="text-xs h-7 px-2"
                                  >
                                    נקה
                                  </Button>
                                </div>
                              </div>

                              {/* Search Input */}
                              <Input
                                type="text"
                                placeholder="🔍 חפש לפי שם..."
                                value={userSearchQuery}
                                onChange={(e) => setUserSearchQuery(e.target.value)}
                                className="mb-3 h-9"
                              />

                              {/* User List */}
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {users
                                  .filter(user =>
                                    user.full_name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                                    user.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
                                  )
                                  .map(user => (
                                  <label
                                    key={user.id}
                                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-indigo-50 transition-colors ${
                                      selectedUsersForEmail.has(user.id) ? 'bg-indigo-100' : ''
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedUsersForEmail.has(user.id)}
                                      onChange={() => {
                                        const newSelected = new Set(selectedUsersForEmail)
                                        if (newSelected.has(user.id)) {
                                          newSelected.delete(user.id)
                                        } else {
                                          newSelected.add(user.id)
                                        }
                                        setSelectedUsersForEmail(newSelected)
                                      }}
                                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-gray-800">{user.full_name}</div>
                                      <div className="text-gray-500 text-xs">{user.email}</div>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Selected Users Display */}
                          {selectedUsersForEmail.size > 0 && !sendToAllUsers && !showUserSelector && (
                            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-3">
                              <p className="text-sm text-indigo-700 font-medium mb-2">
                                📬 נבחרו {selectedUsersForEmail.size} משתמשים:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {users.filter(u => selectedUsersForEmail.has(u.id)).map(user => (
                                  <span
                                    key={user.id}
                                    className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs"
                                  >
                                    {user.full_name}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newSelected = new Set(selectedUsersForEmail)
                                        newSelected.delete(user.id)
                                        setSelectedUsersForEmail(newSelected)
                                      }}
                                      className="hover:bg-indigo-200 rounded-full p-0.5"
                                    >
                                      ✕
                                    </button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* All Users Selected Display */}
                          {sendToAllUsers && (
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                              <p className="text-sm text-purple-700 font-medium">
                                📢 שליחה לכל {users.length} המשתמשים במערכת
                              </p>
                              <p className="text-xs text-purple-600 mt-1">
                                המייל יישלח לכל המשתמשים בזה אחר זה. פעולה זו עשויה להימשך מספר דקות.
                              </p>
                              {bulkEmailProgress.total > 0 && (
                                <div className="mt-3">
                                  <div className="flex justify-between text-xs text-purple-600 mb-1">
                                    <span>התקדמות: {bulkEmailProgress.sent + bulkEmailProgress.failed} / {bulkEmailProgress.total}</span>
                                    <span>✅ {bulkEmailProgress.sent} | ❌ {bulkEmailProgress.failed}</span>
                                  </div>
                                  <div className="w-full bg-purple-200 rounded-full h-2">
                                    <div
                                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${((bulkEmailProgress.sent + bulkEmailProgress.failed) / bulkEmailProgress.total) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Manual Email Input - only when no users selected */}
                          {!sendToAllUsers && selectedUsersForEmail.size === 0 && (
                            <div className="border-t border-gray-200 pt-3 mt-3">
                              <p className="text-sm text-gray-500 mb-2">או הזן כתובת מייל ידנית:</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    כתובת מייל
                                  </label>
                                  <Input
                                    type="email"
                                    value={customEmailTo}
                                    onChange={(e) => setCustomEmailTo(e.target.value)}
                                    placeholder="example@email.com"
                                    dir="ltr"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    שם הנמען (אופציונלי)
                                  </label>
                                  <Input
                                    type="text"
                                    value={customEmailName}
                                    onChange={(e) => setCustomEmailName(e.target.value)}
                                    placeholder="ישראל ישראלי"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Progress bar for selected users */}
                          {selectedUsersForEmail.size > 0 && !sendToAllUsers && bulkEmailProgress.total > 0 && (
                            <div className="mt-3">
                              <div className="flex justify-between text-xs text-indigo-600 mb-1">
                                <span>התקדמות: {bulkEmailProgress.sent + bulkEmailProgress.failed} / {bulkEmailProgress.total}</span>
                                <span>✅ {bulkEmailProgress.sent} | ❌ {bulkEmailProgress.failed}</span>
                              </div>
                              <div className="w-full bg-indigo-200 rounded-full h-2">
                                <div
                                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${((bulkEmailProgress.sent + bulkEmailProgress.failed) / bulkEmailProgress.total) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Template Selection */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            בחר תבנית או כתוב הודעה חדשה
                          </label>
                          <select
                            value=""
                            onChange={(e) => {
                              const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
                              const templates: Record<string, { subject: string; message: string }> = {
                                welcome: {
                                  subject: '🎉 ברוך הבא למערכת ארון הציוד',
                                  message: `ברוך הבא למערכת ארון הציוד של ידידים!\n\nאנחנו שמחים שהצטרפת אלינו. המערכת מאפשרת לך לנהל ולבקש ציוד בקלות.\n\n🔗 קישור לכניסה למערכת:\n${appUrl}/login\n\nאם יש לך שאלות, אל תהסס ליצור קשר.`
                                },
                                reminder: {
                                  subject: '⏰ תזכורת - החזרת ציוד',
                                  message: 'היי,\n\nזוהי תזכורת ידידותית להחזרת הציוד שהושאל.\n\nאם כבר החזרת את הציוד - מתנצלים על ההודעה המיותרת.\n\nתודה על שיתוף הפעולה!'
                                },
                                update: {
                                  subject: '📢 עדכון חשוב מארון הציוד',
                                  message: `שלום,\n\nרצינו לעדכן אותך בנוגע לשינויים/עדכונים במערכת ארון הציוד.\n\n[כתוב כאן את העדכון]\n\n🔗 קישור לכניסה למערכת:\n${appUrl}/login\n\nבברכה,\nצוות ארון הציוד`
                                },
                                thanks: {
                                  subject: '🙏 תודה על השימוש בארון הציוד',
                                  message: 'שלום,\n\nרצינו להודות לך על השימוש במערכת ארון הציוד של ידידים.\n\nהציוד שלנו עוזר לאנשים רבים בזכות מתנדבים כמוך.\n\nתודה!'
                                },
                                custom: {
                                  subject: '',
                                  message: ''
                                }
                              }
                              const template = templates[e.target.value]
                              if (template) {
                                setCustomEmailSubject(template.subject)
                                setCustomEmailMessage(template.message)
                              }
                            }}
                            className="w-full h-10 border-2 border-gray-200 rounded-lg px-3 bg-white"
                          >
                            <option value="">-- בחר תבנית --</option>
                            <option value="welcome">🎉 ברוך הבא</option>
                            <option value="reminder">⏰ תזכורת החזרת ציוד</option>
                            <option value="update">📢 עדכון חשוב</option>
                            <option value="thanks">🙏 תודה</option>
                            <option value="custom">✏️ הודעה חופשית</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            נושא *
                          </label>
                          <Input
                            type="text"
                            value={customEmailSubject}
                            onChange={(e) => setCustomEmailSubject(e.target.value)}
                            placeholder="נושא ההודעה..."
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            תוכן ההודעה *
                          </label>
                          <textarea
                            value={customEmailMessage}
                            onChange={(e) => setCustomEmailMessage(e.target.value)}
                            placeholder="כתוב את תוכן ההודעה כאן..."
                            required
                            rows={5}
                            className="w-full border-2 border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowCustomEmailForm(false)}
                          >
                            ביטול
                          </Button>
                          <Button
                            type="submit"
                            disabled={sendingCustomEmail}
                            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                          >
                            {sendingCustomEmail
                              ? (sendToAllUsers || selectedUsersForEmail.size > 0
                                  ? `⏳ שולח... (${bulkEmailProgress.sent + bulkEmailProgress.failed}/${bulkEmailProgress.total})`
                                  : '⏳ שולח...')
                              : (sendToAllUsers
                                  ? `📤 שלח לכל ${users.length} המשתמשים`
                                  : selectedUsersForEmail.size > 0
                                    ? `📤 שלח ל-${selectedUsersForEmail.size} משתמשים`
                                    : '📤 שלח מייל')}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}
                {emailLogsLoading ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4 animate-spin">⏳</div>
                    <p className="text-gray-500 text-lg">טוען מיילים...</p>
                  </div>
                ) : emailLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-6xl mb-4 block">📭</span>
                    <p className="text-gray-500 text-lg">לא נמצאו מיילים</p>
                    <p className="text-gray-400 text-sm mt-2">מיילים שישלחו יופיעו כאן</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Select All / Delete Selected Bar */}
                    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedEmails.size === emailLogs.length && emailLogs.length > 0}
                          onChange={toggleSelectAllEmails}
                          className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm font-medium">בחר הכל ({emailLogs.length})</span>
                      </label>
                      {selectedEmails.size > 0 && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleDeleteSelectedEmails}
                          disabled={deletingSelectedEmails}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          {deletingSelectedEmails ? '⏳ מוחק...' : `🗑️ מחק ${selectedEmails.size} נבחרים`}
                        </Button>
                      )}
                    </div>

                    {emailLogs.map((log) => {
                      const isExpanded = expandedEmails.has(log.id)
                      const isSelected = selectedEmails.has(log.id)
                      return (
                        <div
                          key={log.id}
                          className={`bg-gradient-to-r ${log.status === 'sent' ? 'from-green-50 to-emerald-50 border-green-200' : 'from-red-50 to-rose-50 border-red-200'} rounded-xl p-4 border-2 ${isSelected ? 'ring-2 ring-purple-500' : ''}`}
                        >
                          {/* Header with checkbox, name, email, and status */}
                          <div className="flex items-start gap-3 mb-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleEmailSelection(log.id)}
                              className="w-5 h-5 mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                            <span className="text-xl flex-shrink-0">
                              {log.status === 'sent' ? '✅' : '❌'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-800 truncate">{log.recipient_name || 'לא צוין'}</p>
                              <p className="text-sm text-gray-600 truncate">{log.recipient_email}</p>
                            </div>
                          </div>

                          {/* Action buttons - responsive */}
                          <div className="flex flex-col sm:flex-row gap-2 mb-2 mr-8">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleEmailExpand(log.id)}
                              className="h-10 flex-1 sm:flex-initial"
                            >
                              {isExpanded ? '📄 הסתר פרטים' : '📋 הצג פרטים'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteEmailLog(log.id)}
                              className="h-10 bg-red-500 hover:bg-red-600 flex-1 sm:flex-initial"
                            >
                              🗑️ מחק
                            </Button>
                          </div>

                          {/* תצוגה מצומצמת */}
                          <div className="text-sm text-gray-700 mb-2">
                            <span className="font-semibold">נושא:</span> {log.subject}
                          </div>

                          {/* תצוגה מורחבת */}
                          {isExpanded && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3 pt-3 border-t border-gray-200">
                              <div className="text-sm">
                                <span className="font-semibold text-gray-700">סוג:</span>{' '}
                                <span className="text-purple-600">
                                  {log.email_type === 'password_reset' && 'איפוס סיסמה'}
                                  {log.email_type === 'welcome' && 'ברוך הבא'}
                                  {log.email_type === 'email_update' && 'עדכון מייל'}
                                  {log.email_type === 'verification' && 'אימות'}
                                  {log.email_type === 'other' && 'אחר'}
                                </span>
                              </div>
                              <div className="text-sm">
                                <span className="font-semibold text-gray-700">נשלח על ידי:</span>{' '}
                                <span className="text-gray-600">{log.sent_by || 'מערכת'}</span>
                              </div>
                              <div className="text-sm">
                                <span className="font-semibold text-gray-700">תאריך:</span>{' '}
                                <span className="text-gray-600">
                                  {new Date(log.created_at).toLocaleDateString('he-IL', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <div className="text-sm">
                                <span className="font-semibold text-gray-700">סטטוס:</span>{' '}
                                <span className={log.status === 'sent' ? 'text-green-600' : 'text-red-600'}>
                                  {log.status === 'sent' ? 'נשלח בהצלחה' : 'נכשל'}
                                </span>
                              </div>
                              {log.metadata && Object.keys(log.metadata).length > 0 && (
                                <div className="text-sm col-span-full">
                                  <span className="font-semibold text-gray-700">מידע נוסף:</span>{' '}
                                  <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}

                          {log.error_message && (
                            <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                              <span className="font-semibold">שגיאה:</span> {log.error_message}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
