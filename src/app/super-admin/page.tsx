'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { City, CityForm, AdminNotification } from '@/types'
import Logo from '@/components/Logo'
import { loginSuperAdmin, checkAuth, logout } from '@/lib/auth'

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
  const [activeTab, setActiveTab] = useState<'cities' | 'notifications' | 'settings' | 'users' | 'emails'>('cities')
  const [showAddCity, setShowAddCity] = useState(false)
  const [newCity, setNewCity] = useState<CityForm>({ name: '', manager1_name: '', manager1_phone: '', manager2_name: '', manager2_phone: '', location_url: '', token_location_url: '', password: '' })
  const [editingCity, setEditingCity] = useState<City | null>(null)
  const [changePasswordForm, setChangePasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [cityFilter, setCityFilter] = useState<'all' | 'active' | 'inactive'>('all')

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
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Password visibility state for all password fields
  const [showNewCityPassword, setShowNewCityPassword] = useState(false)
  const [showEditCityPassword, setShowEditCityPassword] = useState(false)
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

  // Filter cities based on selected filter
  const filteredCities = cities.filter(city => {
    if (cityFilter === 'active') return city.is_active
    if (cityFilter === 'inactive') return !city.is_active
    return true // 'all'
  })

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    try {
      const result = await loginSuperAdmin(email, password, rememberMe)
      if (result.success) {
        setIsAuthenticated(true)
        setEmail('')
        setPassword('')
      } else {
        alert(result.error || 'מייל או סיסמה שגויים')
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
      const response = await fetch('/api/super-admin/add-city', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCity.name,
          manager1_name: newCity.manager1_name,
          manager1_phone: newCity.manager1_phone,
          manager2_name: newCity.manager2_name || null,
          manager2_phone: newCity.manager2_phone || null,
          location_url: newCity.location_url || null,
          token_location_url: newCity.token_location_url || null,
          password: newCity.password
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'שגיאה בהוספת העיר')
        return
      }

      alert('העיר נוספה בהצלחה!')
      setNewCity({ name: '', manager1_name: '', manager1_phone: '', manager2_name: '', manager2_phone: '', location_url: '', token_location_url: '', password: '' })
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
          password: editingCity.password,
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
      const updateData: any = {
        user_id: editingUser.id,
        email: userForm.email,
        full_name: userForm.full_name,
        permissions: userForm.permissions,
        phone: userForm.phone || null,
        role: userForm.role,
        city_id: userForm.role === 'city_manager' ? userForm.city_id : null,
        manager_role: userForm.role === 'city_manager' ? (userForm.manager_role || null) : null,
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
    setUserForm({
      email: user.email,
      password: '', // Don't pre-fill password
      full_name: user.full_name,
      role: user.role,
      city_id: user.city?.id || '',
      permissions: user.permissions,
      phone: user.phone || '',
      manager_role: user.manager_role || '',
    })

    // Scroll to the form
    setTimeout(() => {
      const formElement = document.querySelector('[data-edit-user-form]')
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  const filteredUsers = users.filter(user => {
    if (userFilter === 'all') return true
    return user.role === userFilter
  })

  // Load users when switching to users tab
  useEffect(() => {
    if (isAuthenticated && activeTab === 'users') {
      fetchUsers()
    }
  }, [isAuthenticated, activeTab])

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

        {/* Tab Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
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
            onClick={() => setActiveTab('emails')}
            className={`py-6 rounded-xl font-semibold text-lg transition-all duration-300 ${
              activeTab === 'emails'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50 scale-105'
                : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
            }`}
          >
            <span className="text-2xl ml-2">📧</span> מיילים
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
                    <label className="block text-sm font-semibold text-gray-700">📍 קישור למיקום הארון - דף ראשי <span className="text-gray-400 text-xs">(אופציונלי)</span></label>
                    <Input
                      type="url"
                      value={newCity.location_url}
                      onChange={(e) => setNewCity({ ...newCity, location_url: e.target.value })}
                      placeholder="https://maps.google.com/?q=31.7683,35.2137"
                      className="h-12"
                    />
                    <p className="text-xs text-gray-500">יוצג בדף הראשי לכל המשתמשים (השאר ריק להסתרה)</p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700">🔐 קישור למיקום הארון - טוקן בלבד <span className="text-gray-400 text-xs">(אופציונלי)</span></label>
                    <Input
                      type="url"
                      value={newCity.token_location_url || ''}
                      onChange={(e) => setNewCity({ ...newCity, token_location_url: e.target.value })}
                      placeholder="https://maps.google.com/?q=31.7683,35.2137"
                      className="h-12 border-purple-200 focus:border-purple-500"
                    />
                    <p className="text-xs text-purple-600">יוצג רק בדף הטוקן לאחר אישור בקשה</p>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">🔐 סיסמת העיר</label>
                    <div className="relative">
                      <Input
                        type={showNewCityPassword ? "text" : "password"}
                        value={newCity.password}
                        onChange={(e) => setNewCity({ ...newCity, password: e.target.value })}
                        placeholder="הזן סיסמה"
                        className="h-12 pr-12"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewCityPassword(!showNewCityPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                        tabIndex={-1}
                      >
                        {showNewCityPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
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
            {/* Filter Buttons */}
            <div className="flex gap-2 mb-6">
              <Button
                onClick={() => setCityFilter('all')}
                className={`flex-1 ${cityFilter === 'all' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' : 'bg-white text-gray-600 border-2 border-gray-200'}`}
              >
                הכל ({cities.length})
              </Button>
              <Button
                onClick={() => setCityFilter('active')}
                className={`flex-1 ${cityFilter === 'active' ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' : 'bg-white text-gray-600 border-2 border-gray-200'}`}
              >
                🟢 פעילות ({cities.filter(c => c.is_active).length})
              </Button>
              <Button
                onClick={() => setCityFilter('inactive')}
                className={`flex-1 ${cityFilter === 'inactive' ? 'bg-gradient-to-r from-gray-600 to-slate-600 text-white' : 'bg-white text-gray-600 border-2 border-gray-200'}`}
              >
                🔴 מושבתות ({cities.filter(c => !c.is_active).length})
              </Button>
            </div>

            <div className="space-y-4">
              {filteredCities.map(city => (
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
                        <div className="relative">
                          <Input
                            type={showEditCityPassword ? "text" : "password"}
                            value={editingCity.password}
                            onChange={(e) => setEditingCity({ ...editingCity, password: e.target.value })}
                            placeholder="סיסמה"
                            required
                            className="pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowEditCityPassword(!showEditCityPassword)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                            tabIndex={-1}
                          >
                            {showEditCityPassword ? '👁️' : '👁️‍🗨️'}
                          </button>
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
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                        <Button
                          onClick={() => router.push(`/city/${city.id}/admin`)}
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-sm md:text-base h-10 md:h-auto"
                        >
                          <span className="hidden sm:inline">🚪 כניסה לניהול</span>
                          <span className="sm:hidden">🚪 ניהול</span>
                        </Button>
                        {currentUser?.permissions !== 'view_only' && (
                          <>
                            <Button
                              onClick={() => setEditingCity(city)}
                              className="bg-blue-500 hover:bg-blue-600 text-sm md:text-base h-10 md:h-auto"
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
                              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-sm md:text-base h-10 md:h-auto"
                            >
                              🔑 אפס סיסמה
                            </Button>
                            <Button
                              onClick={() => handleToggleActive(city)}
                              disabled={loading}
                              className={`text-sm md:text-base h-10 md:h-auto ${city.is_active ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'}`}
                            >
                              <span className="hidden sm:inline">{city.is_active ? '🔴 השבת' : '🟢 הפעל'}</span>
                              <span className="sm:hidden">{city.is_active ? '🔴' : '🟢'}</span>
                            </Button>
                            <Button
                              onClick={() => handleDeleteCity(city)}
                              disabled={loading}
                              className="bg-red-500 hover:bg-red-600 text-sm md:text-base h-10 md:h-auto"
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
            {/* Add User Button & Filter */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
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
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {showAddUser ? '❌ ביטול' : '➕ הוספת משתמש חדש'}
              </Button>

              {/* User count - only city managers shown */}
              <div className="px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
                <span className="text-gray-700 font-semibold">
                  סה"כ מנהלי ערים: <span className="text-purple-600">{users.length}</span>
                </span>
              </div>
            </div>

            {/* Add/Edit User Form */}
            {(showAddUser || editingUser) && (
              <Card className="mb-6 border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 shadow-lg" data-edit-user-form>
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-gray-800">
                    {editingUser ? '✏️ עריכת משתמש' : '➕ הוספת משתמש חדש'}
                  </CardTitle>
                  <CardDescription>
                    {editingUser ? 'ערוך את פרטי המשתמש' : 'מלא את כל הפרטים ליצירת משתמש חדש'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">👤 שם מלא</label>
                        <Input
                          type="text"
                          value={userForm.full_name}
                          onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                          placeholder="שם מלא"
                          className="h-12 border-2 border-gray-200 rounded-xl focus:border-purple-500 transition-colors"
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
                          className="h-12 border-2 border-gray-200 rounded-xl focus:border-purple-500 transition-colors"
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
                          className="h-12 border-2 border-gray-200 rounded-xl focus:border-purple-500 transition-colors"
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
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">🏙️ עיר {editingUser && '(ניתן לשנות)'}</label>
                            <select
                              value={userForm.city_id}
                              onChange={(e) => setUserForm({ ...userForm, city_id: e.target.value })}
                              className="w-full h-12 border-2 border-gray-200 rounded-xl focus:border-purple-500 transition-colors px-3"
                              required={userForm.role === 'city_manager'}
                            >
                              <option value="">בחר עיר</option>
                              {cities.map(city => (
                                <option key={city.id} value={city.id}>{city.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">👔 תפקיד מנהל {editingUser && '(ניתן לשנות)'}</label>
                            <select
                              value={userForm.manager_role}
                              onChange={(e) => setUserForm({ ...userForm, manager_role: e.target.value as '' | 'manager1' | 'manager2' })}
                              className="w-full h-12 border-2 border-gray-200 rounded-xl focus:border-purple-500 transition-colors px-3"
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
                        className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200 hover:shadow-lg transition-all duration-200"
                      >
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-2xl">
                                {user.role === 'super_admin' ? '👑' : '👤'}
                              </span>
                              <div>
                                <h3 className="text-xl font-bold text-gray-800">{user.full_name}</h3>
                                <p className="text-sm text-gray-600">{user.email}</p>
                              </div>
                              {!user.is_active && (
                                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">מושבת</span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
                              <div className="text-sm">
                                <span className="font-semibold text-gray-700">תפקיד:</span>{' '}
                                <span className="text-purple-600">
                                  {user.role === 'super_admin' ? 'מנהל ראשי' : 'מנהל עיר'}
                                </span>
                              </div>

                              {user.city && (
                                <div className="text-sm">
                                  <span className="font-semibold text-gray-700">עיר:</span>{' '}
                                  <span className="text-purple-600">{user.city.name}</span>
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
                          </div>

                          <div className="flex gap-2 flex-wrap">
                            <Button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleEditUser(user)
                                setShowAddUser(false)
                              }}
                              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
                            >
                              ✏️ ערוך
                            </Button>
                            <Button
                              type="button"
                              onClick={async (e) => {
                                e.preventDefault()
                                e.stopPropagation()

                                const newPassword = prompt('הזן סיסמה חדשה (השאר ריק עבור 123456):') ?? '123456'

                                if (newPassword.length < 4) {
                                  alert('הסיסמה חייבת להכיל לפחות 4 תווים')
                                  return
                                }

                                if (!confirm(`האם לאפס את הסיסמה של ${user.full_name}?\nסיסמה חדשה: ${newPassword}`)) return

                                setLoading(true)
                                try {
                                  const response = await fetch('/api/admin/users/reset-password', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    credentials: 'include',
                                    body: JSON.stringify({
                                      user_id: user.id,
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
                                  console.error('Error resetting password:', error)
                                  alert('אירעה שגיאה באיפוס הסיסמה')
                                } finally {
                                  setLoading(false)
                                }
                              }}
                              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
                            >
                              🔑 אפס סיסמה
                            </Button>
                            <Button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleDeleteUser(user)
                              }}
                              className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
                            >
                              🗑️ מחק
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

        {activeTab === 'emails' && (
          <Card className="border-0 shadow-2xl rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-4">
              <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <span className="text-3xl">📧</span>
                בדיקת מערכת מיילים
              </CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                שלח מייל בדיקה לכל כתובת מייל כדי לוודא שמערכת המיילים פועלת תקין
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="max-w-2xl mx-auto">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const formData = new FormData(e.currentTarget)
                    const testEmail = formData.get('testEmail') as string
                    const testName = formData.get('testName') as string
                    const testMessage = formData.get('testMessage') as string

                    if (!testEmail) {
                      alert('אנא הזן כתובת מייל')
                      return
                    }

                    setLoading(true)
                    try {
                      const response = await fetch('/api/email/test', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          email: testEmail,
                          name: testName || undefined,
                          message: testMessage || undefined,
                        }),
                      })

                      const data = await response.json()

                      if (response.ok && data.success) {
                        alert(`✅ המייל נשלח בהצלחה ל-${testEmail}!\n\nבדוק את תיבת המייל (גם בתיקיית spam).`)
                        // Clear form
                        e.currentTarget.reset()
                      } else {
                        alert(`❌ שגיאה: ${data.error || 'שליחת המייל נכשלה'}`)
                      }
                    } catch (error) {
                      console.error('Error:', error)
                      alert(`❌ שגיאת תקשורת: ${error instanceof Error ? error.message : 'Unknown error'}`)
                    } finally {
                      setLoading(false)
                    }
                  }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <label htmlFor="testEmail" className="block text-sm font-semibold text-gray-700">
                      כתובת אימייל: <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="testEmail"
                      name="testEmail"
                      type="email"
                      placeholder="example@example.com"
                      required
                      disabled={loading}
                      className="h-14 text-base border-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="testName" className="block text-sm font-semibold text-gray-700">
                      שם (אופציונלי):
                    </label>
                    <Input
                      id="testName"
                      name="testName"
                      type="text"
                      placeholder="השם שלך"
                      disabled={loading}
                      className="h-14 text-base border-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="testMessage" className="block text-sm font-semibold text-gray-700">
                      הודעה מותאמת אישית (אופציונלי):
                    </label>
                    <textarea
                      id="testMessage"
                      name="testMessage"
                      rows={4}
                      placeholder="הזן כאן את ההודעה שתרצה לשלוח במייל..."
                      disabled={loading}
                      className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    {loading ? (
                      <>
                        <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></span>
                        שולח מייל...
                      </>
                    ) : (
                      <>
                        <span className="text-xl ml-2">📤</span>
                        שלח מייל בדיקה
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
                  <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="text-xl">ℹ️</span>
                    הוראות שימוש:
                  </h3>
                  <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
                    <li>הזן את כתובת המייל שאליה תרצה לשלוח מייל בדיקה</li>
                    <li>הזן את השם (אופציונלי) - יופיע במייל</li>
                    <li>לחץ על &quot;שלח מייל בדיקה&quot;</li>
                    <li>בדוק את תיבת המייל של הנמען (גם בתיקיית spam)</li>
                    <li>המייל צריך להגיע תוך מספר שניות</li>
                  </ol>
                </div>

                <div className="mt-6 p-6 bg-green-50 border-2 border-green-200 rounded-xl">
                  <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="text-xl">✅</span>
                    מה מבדק המייל?
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                    <li>חיבור לשרת Resend</li>
                    <li>תקינות API Key</li>
                    <li>יכולת שליחת מיילים</li>
                    <li>תבנית המייל בעברית (RTL)</li>
                    <li>עיצוב ומיתוג נכון</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
