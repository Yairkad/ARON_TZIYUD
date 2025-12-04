'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import toast, { Toaster } from 'react-hot-toast'

interface Manager {
  id?: string
  full_name: string
  phone: string
  role: string
  is_primary: boolean
}

interface Station {
  id: string
  name: string
  address: string
  city_id: string | null
  is_active: boolean
  manager_password: string | null
  wheel_station_managers: Manager[]
  totalWheels: number
  availableWheels: number
  cities?: { name: string }
}

interface City {
  id: string
  name: string
}

// Super admin password - stored in environment variable
const WHEELS_ADMIN_PASSWORD = process.env.NEXT_PUBLIC_WHEELS_ADMIN_PASSWORD || 'wheels2024'

export default function WheelsAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const [stations, setStations] = useState<Station[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Modals
  const [showAddStation, setShowAddStation] = useState(false)
  const [editingStation, setEditingStation] = useState<Station | null>(null)
  const [expandedStation, setExpandedStation] = useState<string | null>(null)

  // Form
  const [stationForm, setStationForm] = useState({
    name: '',
    address: '',
    city_id: '',
    manager_password: '',
    managers: [] as Manager[]
  })

  // Confirm dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmDialogData, setConfirmDialogData] = useState<{
    title: string
    message: string
    onConfirm: () => void
  } | null>(null)

  useEffect(() => {
    // Check if already logged in
    const saved = sessionStorage.getItem('wheels_admin_auth')
    if (saved === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchStations()
      fetchCities()
    }
  }, [isAuthenticated])

  const handleLogin = () => {
    if (password === WHEELS_ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      sessionStorage.setItem('wheels_admin_auth', 'true')
      setPasswordError('')
    } else {
      setPasswordError('סיסמא שגויה')
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    sessionStorage.removeItem('wheels_admin_auth')
  }

  const fetchStations = async () => {
    try {
      const response = await fetch('/api/wheel-stations/admin')
      if (response.ok) {
        const data = await response.json()
        setStations(data.stations || [])
      }
    } catch (err) {
      console.error('Error fetching stations:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCities = async () => {
    try {
      const response = await fetch('/api/cities')
      if (response.ok) {
        const data = await response.json()
        setCities(data.cities || [])
      }
    } catch (err) {
      console.error('Error fetching cities:', err)
    }
  }

  const resetForm = () => {
    setStationForm({
      name: '',
      address: '',
      city_id: '',
      manager_password: '',
      managers: []
    })
  }

  const handleAddStation = async () => {
    if (!stationForm.name) {
      toast.error('נא להזין שם תחנה')
      return
    }
    setActionLoading(true)
    try {
      const response = await fetch('/api/wheel-stations/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...stationForm,
          admin_password: password
        })
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create station')
      }
      await fetchStations()
      setShowAddStation(false)
      resetForm()
      toast.success('התחנה נוצרה בהצלחה!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'שגיאה ביצירת תחנה')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateStation = async () => {
    if (!editingStation) return
    setActionLoading(true)
    try {
      const response = await fetch(`/api/wheel-stations/admin/${editingStation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...stationForm,
          admin_password: password
        })
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update station')
      }
      await fetchStations()
      setEditingStation(null)
      resetForm()
      toast.success('התחנה עודכנה בהצלחה!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בעדכון תחנה')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteStation = async (station: Station) => {
    setConfirmDialogData({
      title: '🗑️ מחיקת תחנה',
      message: `האם למחוק את תחנת "${station.name}"? פעולה זו תמחק גם את כל הגלגלים והיסטוריית ההשאלות!`,
      onConfirm: async () => {
        setShowConfirmDialog(false)
        setConfirmDialogData(null)
        setActionLoading(true)
        try {
          const response = await fetch(`/api/wheel-stations/admin/${station.id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_password: password })
          })
          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Failed to delete station')
          }
          await fetchStations()
          toast.success('התחנה נמחקה!')
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : 'שגיאה במחיקת תחנה')
        } finally {
          setActionLoading(false)
        }
      }
    })
    setShowConfirmDialog(true)
  }

  const handleToggleActive = async (station: Station) => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/wheel-stations/admin/${station.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: !station.is_active,
          admin_password: password
        })
      })
      if (!response.ok) throw new Error('Failed to update')
      await fetchStations()
    } catch {
      toast.error('שגיאה בעדכון סטטוס')
    } finally {
      setActionLoading(false)
    }
  }

  const openEditModal = (station: Station) => {
    setStationForm({
      name: station.name,
      address: station.address || '',
      city_id: station.city_id || '',
      manager_password: station.manager_password || '',
      managers: station.wheel_station_managers || []
    })
    setEditingStation(station)
  }

  const addManager = () => {
    if (stationForm.managers.length >= 4) {
      toast.error('ניתן להוסיף עד 4 מנהלים')
      return
    }
    setStationForm({
      ...stationForm,
      managers: [...stationForm.managers, { full_name: '', phone: '', role: 'מנהל תחנה', is_primary: false }]
    })
  }

  const removeManager = (index: number) => {
    setStationForm({
      ...stationForm,
      managers: stationForm.managers.filter((_, i) => i !== index)
    })
  }

  const updateManager = (index: number, field: string, value: string | boolean) => {
    const updated = [...stationForm.managers]
    updated[index] = { ...updated[index], [field]: value }
    setStationForm({ ...stationForm, managers: updated })
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div style={styles.container}>
        <div style={styles.loginBox}>
          <h1 style={styles.loginTitle}>🔐 ניהול תחנות גלגלים</h1>
          <p style={styles.loginSubtitle}>הזן סיסמת מנהל</p>
          <input
            type="password"
            placeholder="סיסמא"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={styles.input}
          />
          {passwordError && <div style={styles.errorText}>{passwordError}</div>}
          <button style={styles.loginBtn} onClick={handleLogin}>כניסה</button>
          <Link href="/wheels" style={styles.backLink}>← חזרה לרשימת התחנות</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
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
            iconTheme: { primary: '#10b981', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
      />
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <Link href="/wheels" style={styles.backBtn}>← חזרה</Link>
          <button style={styles.logoutBtn} onClick={handleLogout}>🚪 יציאה</button>
        </div>
        <h1 style={styles.title}>⚙️ ניהול תחנות גלגלים</h1>
        <p style={styles.subtitle}>{stations.length} תחנות במערכת</p>
      </header>

      {/* Add Station Button */}
      <button style={styles.addStationBtn} onClick={() => { resetForm(); setShowAddStation(true) }}>
        ➕ הוסף תחנה חדשה
      </button>

      {/* Stations List */}
      {loading ? (
        <div style={styles.loading}>טוען...</div>
      ) : (
        <div style={styles.stationsList}>
          {stations.map(station => (
            <div key={station.id} style={styles.stationCard}>
              <div style={styles.stationHeader} onClick={() => setExpandedStation(expandedStation === station.id ? null : station.id)}>
                <div style={styles.stationInfo}>
                  <span style={{
                    ...styles.statusDot,
                    background: station.is_active ? '#10b981' : '#ef4444'
                  }} />
                  <h3 style={styles.stationName}>{station.name}</h3>
                  {station.cities?.name && <span style={styles.cityBadge}>{station.cities.name}</span>}
                </div>
                <div style={styles.stationStats}>
                  <span style={styles.statBadge}>{station.totalWheels} גלגלים</span>
                  <span style={{...styles.statBadge, background: 'rgba(16,185,129,0.2)', color: '#10b981'}}>
                    {station.availableWheels} זמינים
                  </span>
                  <span style={styles.expandIcon}>{expandedStation === station.id ? '▼' : '▶'}</span>
                </div>
              </div>

              {expandedStation === station.id && (
                <div style={styles.stationDetails}>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>כתובת:</span>
                    <span>{station.address || 'לא הוגדרה'}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>סיסמת תחנה:</span>
                    <span style={styles.passwordDisplay}>
                      {station.manager_password || <span style={{color: '#ef4444'}}>לא הוגדרה!</span>}
                    </span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>מנהלים:</span>
                    <span>{station.wheel_station_managers?.length || 0}</span>
                  </div>

                  {station.wheel_station_managers?.length > 0 && (
                    <div style={styles.managersList}>
                      {station.wheel_station_managers.map((m, i) => (
                        <div key={i} style={styles.managerItem}>
                          👤 {m.full_name} - {m.phone}
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={styles.stationActions}>
                    <button style={styles.editBtn} onClick={() => openEditModal(station)}>✏️ ערוך</button>
                    <button
                      style={station.is_active ? styles.deactivateBtn : styles.activateBtn}
                      onClick={() => handleToggleActive(station)}
                      disabled={actionLoading}
                    >
                      {station.is_active ? '🔴 השבת' : '🟢 הפעל'}
                    </button>
                    <button style={styles.deleteBtn} onClick={() => handleDeleteStation(station)} disabled={actionLoading}>
                      🗑️ מחק
                    </button>
                    <Link href={`/wheels/${station.id}`} style={styles.viewBtn}>👁️ צפה</Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Station Modal */}
      {(showAddStation || editingStation) && (
        <div style={styles.modalOverlay} onClick={() => { setShowAddStation(false); setEditingStation(null) }}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              {editingStation ? '✏️ עריכת תחנה' : '➕ תחנה חדשה'}
            </h3>

            <div style={styles.formGroup}>
              <label style={styles.label}>שם התחנה *</label>
              <input
                type="text"
                value={stationForm.name}
                onChange={e => setStationForm({...stationForm, name: e.target.value})}
                style={styles.input}
                placeholder="לדוגמה: תחנת בית שמש"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>כתובת</label>
              <input
                type="text"
                value={stationForm.address}
                onChange={e => setStationForm({...stationForm, address: e.target.value})}
                style={styles.input}
                placeholder="רחוב ומספר"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>עיר</label>
              <select
                value={stationForm.city_id}
                onChange={e => setStationForm({...stationForm, city_id: e.target.value})}
                style={styles.input}
              >
                <option value="">בחר עיר (אופציונלי)</option>
                {cities.map(city => (
                  <option key={city.id} value={city.id}>{city.name}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>סיסמת תחנה (לכניסת מנהלים)</label>
              <input
                type="text"
                value={stationForm.manager_password}
                onChange={e => setStationForm({...stationForm, manager_password: e.target.value})}
                style={styles.input}
                placeholder="לפחות 4 תווים"
              />
            </div>

            <div style={styles.managersSection}>
              <div style={styles.managersSectionHeader}>
                <label style={styles.label}>מנהלי תחנה ({stationForm.managers.length}/4)</label>
                <button style={styles.addManagerBtn} onClick={addManager} disabled={stationForm.managers.length >= 4}>
                  ➕ הוסף מנהל
                </button>
              </div>

              {stationForm.managers.map((manager, index) => (
                <div key={index} style={styles.managerRow}>
                  <input
                    type="text"
                    placeholder="שם מלא"
                    value={manager.full_name}
                    onChange={e => updateManager(index, 'full_name', e.target.value)}
                    style={styles.inputSmall}
                  />
                  <input
                    type="tel"
                    placeholder="טלפון"
                    value={manager.phone}
                    onChange={e => updateManager(index, 'phone', e.target.value)}
                    style={styles.inputSmall}
                  />
                  <button style={styles.removeManagerBtn} onClick={() => removeManager(index)}>✕</button>
                </div>
              ))}
            </div>

            <div style={styles.modalButtons}>
              <button style={styles.cancelBtn} onClick={() => { setShowAddStation(false); setEditingStation(null) }}>
                ביטול
              </button>
              <button
                style={styles.submitBtn}
                onClick={editingStation ? handleUpdateStation : handleAddStation}
                disabled={actionLoading}
              >
                {actionLoading ? 'שומר...' : (editingStation ? 'עדכן' : 'צור תחנה')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog Modal */}
      {showConfirmDialog && confirmDialogData && (
        <div style={styles.modalOverlay} onClick={() => { setShowConfirmDialog(false); setConfirmDialogData(null) }}>
          <div style={styles.confirmDialog} onClick={e => e.stopPropagation()}>
            <h3 style={styles.confirmTitle}>{confirmDialogData.title}</h3>
            <p style={styles.confirmMessage}>{confirmDialogData.message}</p>
            <div style={styles.confirmButtons}>
              <button style={styles.cancelBtn} onClick={() => { setShowConfirmDialog(false); setConfirmDialogData(null) }}>
                ביטול
              </button>
              <button style={styles.confirmDeleteBtn} onClick={confirmDialogData.onConfirm}>
                מחק
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
    background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
    color: '#fff',
    padding: '20px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    direction: 'rtl',
  },
  // Login styles
  loginBox: {
    maxWidth: '400px',
    margin: '100px auto',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '16px',
    padding: '40px',
    textAlign: 'center',
  },
  loginTitle: {
    fontSize: '1.8rem',
    color: '#f59e0b',
    marginBottom: '10px',
  },
  loginSubtitle: {
    color: '#a0aec0',
    marginBottom: '20px',
  },
  loginBtn: {
    width: '100%',
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: '#000',
    border: 'none',
    padding: '14px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1rem',
    marginTop: '15px',
  },
  backLink: {
    display: 'block',
    color: '#a0aec0',
    textDecoration: 'none',
    marginTop: '20px',
    fontSize: '0.9rem',
  },
  // Header
  header: {
    marginBottom: '30px',
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  backBtn: {
    color: '#a0aec0',
    textDecoration: 'none',
    fontSize: '0.9rem',
  },
  logoutBtn: {
    background: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  title: {
    fontSize: '1.8rem',
    color: '#f59e0b',
    margin: 0,
  },
  subtitle: {
    color: '#a0aec0',
    margin: '5px 0 0',
  },
  // Add button
  addStationBtn: {
    width: '100%',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    padding: '14px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1rem',
    marginBottom: '20px',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#a0aec0',
  },
  // Stations list
  stationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  stationCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  stationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    cursor: 'pointer',
  },
  stationInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  stationName: {
    margin: 0,
    fontSize: '1.1rem',
  },
  cityBadge: {
    background: 'rgba(59, 130, 246, 0.2)',
    color: '#60a5fa',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '0.8rem',
  },
  stationStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  statBadge: {
    background: 'rgba(255,255,255,0.1)',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '0.85rem',
  },
  expandIcon: {
    color: '#a0aec0',
    fontSize: '0.8rem',
  },
  // Station details
  stationDetails: {
    padding: '15px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0,0,0,0.2)',
  },
  detailRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '8px',
  },
  detailLabel: {
    color: '#a0aec0',
    minWidth: '100px',
  },
  passwordDisplay: {
    background: 'rgba(245, 158, 11, 0.2)',
    color: '#f59e0b',
    padding: '2px 8px',
    borderRadius: '4px',
    fontFamily: 'monospace',
  },
  managersList: {
    marginTop: '10px',
    padding: '10px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
  },
  managerItem: {
    padding: '5px 0',
    fontSize: '0.9rem',
  },
  stationActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '15px',
    flexWrap: 'wrap',
  },
  editBtn: {
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.85rem',
  },
  activateBtn: {
    background: '#10b981',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.85rem',
  },
  deactivateBtn: {
    background: '#f59e0b',
    color: '#000',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.85rem',
  },
  deleteBtn: {
    background: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.85rem',
  },
  viewBtn: {
    background: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    textDecoration: 'none',
    display: 'inline-block',
  },
  // Modal
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.8)',
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
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalTitle: {
    color: '#f59e0b',
    marginBottom: '20px',
    fontSize: '1.3rem',
  },
  formGroup: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    color: '#a0aec0',
    fontSize: '0.9rem',
  },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #4a5568',
    background: '#2d3748',
    color: 'white',
    fontSize: '1rem',
    boxSizing: 'border-box',
  },
  inputSmall: {
    flex: 1,
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #4a5568',
    background: '#2d3748',
    color: 'white',
    fontSize: '0.9rem',
  },
  managersSection: {
    marginTop: '20px',
    padding: '15px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '10px',
  },
  managersSectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  addManagerBtn: {
    background: '#10b981',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  managerRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
    alignItems: 'center',
  },
  removeManagerBtn: {
    background: '#ef4444',
    color: 'white',
    border: 'none',
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  modalButtons: {
    display: 'flex',
    gap: '10px',
    marginTop: '25px',
  },
  cancelBtn: {
    flex: 1,
    background: '#4a5568',
    color: 'white',
    border: 'none',
    padding: '14px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  submitBtn: {
    flex: 1,
    background: '#f59e0b',
    color: '#000',
    border: 'none',
    padding: '14px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ef4444',
    fontSize: '0.9rem',
    marginTop: '8px',
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
    color: '#ef4444',
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
  confirmDeleteBtn: {
    flex: 1,
    background: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '14px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1rem',
  },
}
