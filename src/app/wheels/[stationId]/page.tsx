'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import toast, { Toaster } from 'react-hot-toast'

interface Wheel {
  id: string
  wheel_number: number
  rim_size: string
  bolt_count: number
  bolt_spacing: number
  category: string | null
  is_donut: boolean
  notes: string | null
  is_available: boolean
  current_borrow?: {
    borrower_name: string
    borrower_phone: string
    borrow_date: string
    expected_return_date?: string
    deposit_type?: string
    deposit_details?: string
  }
}

interface Manager {
  id: string
  full_name: string
  phone: string
  role: string
  is_primary: boolean
}

interface Station {
  id: string
  name: string
  address: string
  wheels: Wheel[]
  wheel_station_managers: Manager[]
  totalWheels: number
  availableWheels: number
}

interface BorrowForm {
  borrower_name: string
  borrower_phone: string
  expected_return_date: string
  deposit_type: string
  deposit_details: string
  notes: string
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
  const [showBorrowModal, setShowBorrowModal] = useState(false)
  const [showAddWheelModal, setShowAddWheelModal] = useState(false)
  const [showEditWheelModal, setShowEditWheelModal] = useState(false)
  const [selectedWheel, setSelectedWheel] = useState<Wheel | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Forms
  const [borrowForm, setBorrowForm] = useState<BorrowForm>({
    borrower_name: '',
    borrower_phone: '',
    expected_return_date: '',
    deposit_type: '',
    deposit_details: '',
    notes: ''
  })

  const [wheelForm, setWheelForm] = useState<WheelForm>({
    wheel_number: '',
    rim_size: '',
    bolt_count: '4',
    bolt_spacing: '',
    category: '',
    is_donut: false,
    notes: ''
  })

  // Filters
  const [rimSizeFilter, setRimSizeFilter] = useState('')
  const [boltCountFilter, setBoltCountFilter] = useState('')
  const [boltSpacingFilter, setBoltSpacingFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState('')

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
  const [showContactsModal, setShowContactsModal] = useState(false)
  const [contacts, setContacts] = useState<Manager[]>([])

  // Edit station details
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false)
  const [editAddress, setEditAddress] = useState('')

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

  // Borrow wheel
  const handleBorrow = async () => {
    if (!selectedWheel || !borrowForm.borrower_name || !borrowForm.borrower_phone) {
      toast.error('נא למלא שם וטלפון של השואל')
      return
    }
    setActionLoading(true)
    try {
      const response = await fetch(`/api/wheel-stations/${stationId}/wheels/${selectedWheel.id}/borrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...borrowForm,
          manager_phone: currentManager?.phone,
          manager_password: sessionPassword
        })
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to borrow')
      }
      await fetchStation()
      setShowBorrowModal(false)
      setSelectedWheel(null)
      setBorrowForm({
        borrower_name: '',
        borrower_phone: '',
        expected_return_date: '',
        deposit_type: '',
        deposit_details: '',
        notes: ''
      })
      toast.success('הגלגל הושאל בהצלחה!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בהשאלה')
    } finally {
      setActionLoading(false)
    }
  }

  // Return wheel
  const handleReturn = async (wheel: Wheel) => {
    showConfirm({
      title: '📥 החזרת גלגל',
      message: `להחזיר את גלגל #${wheel.wheel_number}?`,
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
    if (!wheelForm.wheel_number || !wheelForm.rim_size || !wheelForm.bolt_spacing) {
      toast.error('נא למלא מספר גלגל, גודל ג\'אנט ומרווח ברגים')
      return
    }
    setActionLoading(true)
    try {
      const response = await fetch(`/api/wheel-stations/${stationId}/wheels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wheel_number: parseInt(wheelForm.wheel_number),
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
              <button style={styles.editContactsBtn} className="station-manager-btn" onClick={() => { setEditAddress(station.address || ''); setShowEditDetailsModal(true) }}>⚙️ <span className="btn-text">ערוך פרטים</span></button>
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

      {/* Filters */}
      <div style={styles.filters}>
        <div style={styles.filtersHeader}>
          <h3 style={styles.filtersTitle}>🔍 סינון</h3>
          <button
            style={{...styles.filtersToggle, ...(showAdvancedFilters ? styles.filtersToggleActive : {})}}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            {showAdvancedFilters ? '- פחות אפשרויות' : '+ עוד אפשרויות'}
          </button>
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

                {/* Manager action buttons */}
                {isManager && (
                  <div style={styles.cardActions} className="station-card-actions">
                    {wheel.is_available ? (
                      <button
                        style={styles.borrowBtn}
                        onClick={() => { setSelectedWheel(wheel); setShowBorrowModal(true) }}
                      >
                        📤 השאל
                      </button>
                    ) : (
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
              {filteredWheels.map(wheel => (
                <tr key={wheel.id} id={`wheel-${wheel.wheel_number}`} style={{...(wheel.is_available ? {} : styles.rowTaken), transition: 'box-shadow 0.3s ease'}}>
                  <td style={styles.td}><strong>{wheel.wheel_number}</strong></td>
                  <td style={styles.td}>{wheel.rim_size}"</td>
                  <td style={styles.td}>{wheel.bolt_count}×{wheel.bolt_spacing}</td>
                  <td style={styles.td}>{wheel.category || '-'}</td>
                  <td style={styles.td}>
                    {wheel.is_donut ? (
                      <span style={styles.donutTag}>🍩 דונאט</span>
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

      {/* Contact Cards */}
      {station.wheel_station_managers.length > 0 && (
        <div style={styles.contacts}>
          <h3 style={styles.contactsTitle}>👥 אנשי קשר</h3>
          <div style={styles.contactsGrid}>
            {station.wheel_station_managers.map(manager => {
              const cleanPhone = manager.phone.replace(/\D/g, '')
              const internationalPhone = cleanPhone.startsWith('0') ? '972' + cleanPhone.slice(1) : cleanPhone
              return (
                <div key={manager.id} style={styles.contactCard}>
                  <div style={styles.contactName}>{manager.full_name}</div>
                  <div style={styles.contactButtons} className="station-contact-buttons">
                    <a href={`tel:${cleanPhone}`} style={styles.contactBtnCall} className="station-contact-btn">
                      📞 התקשר
                    </a>
                    <a
                      href={`https://wa.me/${internationalPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.contactBtnWhatsapp}
                      className="station-contact-btn"
                    >
                      💬 וואטסאפ
                    </a>
                  </div>
                </div>
              )
            })}
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
              <label style={styles.label}>מספר טלפון</label>
              <input
                type="tel"
                placeholder="050-1234567"
                value={loginPhone}
                onChange={e => setLoginPhone(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>סיסמת תחנה</label>
              <input
                type="password"
                placeholder="סיסמא"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                style={styles.input}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
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

      {/* Borrow Modal */}
      {showBorrowModal && selectedWheel && (
        <div style={styles.modalOverlay} onClick={() => setShowBorrowModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>📤 השאלת גלגל #{selectedWheel.wheel_number}</h3>
            <div style={styles.formGroup}>
              <label style={styles.label}>שם השואל *</label>
              <input
                type="text"
                value={borrowForm.borrower_name}
                onChange={e => setBorrowForm({...borrowForm, borrower_name: e.target.value})}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>טלפון *</label>
              <input
                type="tel"
                value={borrowForm.borrower_phone}
                onChange={e => setBorrowForm({...borrowForm, borrower_phone: e.target.value})}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>תאריך החזרה צפוי</label>
              <input
                type="date"
                value={borrowForm.expected_return_date}
                onChange={e => setBorrowForm({...borrowForm, expected_return_date: e.target.value})}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>סוג פיקדון</label>
              <select
                value={borrowForm.deposit_type}
                onChange={e => setBorrowForm({...borrowForm, deposit_type: e.target.value})}
                style={styles.input}
              >
                <option value="">ללא</option>
                <option value="id">תעודת זהות</option>
                <option value="cash">מזומן</option>
                <option value="other">אחר</option>
              </select>
            </div>
            {borrowForm.deposit_type && (
              <div style={styles.formGroup}>
                <label style={styles.label}>פרטי פיקדון</label>
                <input
                  type="text"
                  placeholder={borrowForm.deposit_type === 'cash' ? 'סכום' : 'פרטים'}
                  value={borrowForm.deposit_details}
                  onChange={e => setBorrowForm({...borrowForm, deposit_details: e.target.value})}
                  style={styles.input}
                />
              </div>
            )}
            <div style={styles.formGroup}>
              <label style={styles.label}>הערות</label>
              <textarea
                value={borrowForm.notes}
                onChange={e => setBorrowForm({...borrowForm, notes: e.target.value})}
                style={{...styles.input, minHeight: '60px'}}
              />
            </div>
            <div style={styles.modalButtons}>
              <button style={styles.cancelBtn} onClick={() => setShowBorrowModal(false)}>ביטול</button>
              <button style={styles.submitBtn} onClick={handleBorrow} disabled={actionLoading}>
                {actionLoading ? 'שומר...' : 'השאל'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Wheel Modal */}
      {showAddWheelModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddWheelModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>➕ הוספת גלגל חדש</h3>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>מספר גלגל *</label>
                <input
                  type="number"
                  value={wheelForm.wheel_number}
                  onChange={e => setWheelForm({...wheelForm, wheel_number: e.target.value})}
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>גודל ג'אנט *</label>
                <input
                  type="text"
                  placeholder='14", 15", 16"'
                  value={wheelForm.rim_size}
                  onChange={e => setWheelForm({...wheelForm, rim_size: e.target.value})}
                  style={styles.input}
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
                  onChange={e => setWheelForm({...wheelForm, bolt_spacing: e.target.value})}
                  style={styles.input}
                />
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>קטגוריה</label>
              <select
                value={wheelForm.category}
                onChange={e => setWheelForm({...wheelForm, category: e.target.value})}
                style={styles.input}
              >
                <option value="">ללא קטגוריה</option>
                <option value="מכוניות גרמניות">מכוניות גרמניות</option>
                <option value="מכוניות צרפתיות">מכוניות צרפתיות</option>
                <option value="מכוניות יפניות וקוראניות">מכוניות יפניות וקוראניות</option>
              </select>
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

      {/* Edit Contacts Modal */}
      {showContactsModal && (
        <div style={styles.modalOverlay} onClick={() => setShowContactsModal(false)}>
          <div style={{...styles.modal, maxWidth: '500px'}} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>👥 עריכת אנשי קשר</h3>
            <p style={styles.modalSubtitle}>ניתן להוסיף עד 4 אנשי קשר</p>

            {contacts.map((contact, index) => (
              <div key={index} style={styles.contactEditRow}>
                <div style={styles.contactEditFields}>
                  <input
                    type="text"
                    placeholder="שם מלא"
                    value={contact.full_name}
                    onChange={e => updateContact(index, 'full_name', e.target.value)}
                    style={styles.inputSmall}
                  />
                  <input
                    type="tel"
                    placeholder="טלפון"
                    value={contact.phone}
                    onChange={e => updateContact(index, 'phone', e.target.value)}
                    style={styles.inputSmall}
                  />
                  <select
                    value={contact.role}
                    onChange={e => updateContact(index, 'role', e.target.value)}
                    style={styles.inputSmall}
                  >
                    <option value="מנהל תחנה">מנהל תחנה</option>
                    <option value="מנהל תחנה ראשי">מנהל תחנה ראשי</option>
                  </select>
                </div>
                <button style={styles.removeContactBtn} onClick={() => removeContact(index)}>✕</button>
              </div>
            ))}

            {contacts.length < 4 && (
              <button style={styles.addContactBtn} onClick={addContact}>
                ➕ הוסף איש קשר
              </button>
            )}

            <div style={styles.modalButtons}>
              <button style={styles.cancelBtn} onClick={() => setShowContactsModal(false)}>ביטול</button>
              <button style={styles.submitBtn} onClick={handleSaveContacts} disabled={actionLoading}>
                {actionLoading ? 'שומר...' : 'שמור'}
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
                <input
                  type="password"
                  value={passwordForm.current}
                  onChange={e => setPasswordForm({...passwordForm, current: e.target.value})}
                  style={styles.input}
                />
              </div>
              <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                <div style={{...styles.formGroup, flex: 1, minWidth: '120px'}}>
                  <label style={styles.label}>סיסמה חדשה</label>
                  <input
                    type="password"
                    value={passwordForm.new}
                    onChange={e => setPasswordForm({...passwordForm, new: e.target.value})}
                    style={styles.input}
                  />
                </div>
                <div style={{...styles.formGroup, flex: 1, minWidth: '120px'}}>
                  <label style={styles.label}>אימות</label>
                  <input
                    type="password"
                    value={passwordForm.confirm}
                    onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})}
                    style={styles.input}
                  />
                </div>
              </div>
              <button style={{...styles.smallBtn, background: '#f59e0b', color: '#000'}} onClick={handleChangePassword} disabled={actionLoading}>
                {actionLoading ? 'שומר...' : 'שנה סיסמה'}
              </button>
            </div>

            <button style={{...styles.cancelBtn, width: '100%'}} onClick={() => setShowEditDetailsModal(false)}>סגור</button>
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
            <p style={styles.confirmMessage}>{confirmDialogData.message}</p>
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
}
