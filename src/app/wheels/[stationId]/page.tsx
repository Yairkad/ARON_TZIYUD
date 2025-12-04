'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'

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

type ViewMode = 'cards' | 'table'

export default function StationPage({ params }: { params: Promise<{ stationId: string }> }) {
  const { stationId } = use(params)
  const [station, setStation] = useState<Station | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Filters
  const [rimSizeFilter, setRimSizeFilter] = useState('')
  const [boltSpacingFilter, setBoltSpacingFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState('')

  useEffect(() => {
    fetchStation()
  }, [stationId])

  const fetchStation = async () => {
    try {
      const response = await fetch(`/api/wheel-stations/${stationId}`)
      if (!response.ok) throw new Error('Failed to fetch station')
      const data = await response.json()
      setStation(data.station)
    } catch (err) {
      setError('שגיאה בטעינת התחנה')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredWheels = station?.wheels.filter(wheel => {
    if (rimSizeFilter && wheel.rim_size !== rimSizeFilter) return false
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
      <header style={styles.header}>
        <Link href="/wheels" style={styles.backBtn}>← חזרה</Link>
        <h1 style={styles.title}>🏙️ {station.name}</h1>
        {station.address && <p style={styles.address}>📍 {station.address}</p>}
      </header>

      {/* Stats */}
      <div style={styles.stats}>
        <div style={styles.stat}>
          <div style={styles.statValue}>{station.totalWheels}</div>
          <div style={styles.statLabel}>סה"כ גלגלים</div>
        </div>
        <div style={{...styles.stat, ...styles.statAvailable}}>
          <div style={{...styles.statValue, color: '#10b981'}}>{station.availableWheels}</div>
          <div style={styles.statLabel}>זמינים</div>
        </div>
        <div style={{...styles.stat, ...styles.statTaken}}>
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
        <div style={styles.filterRow}>
          <div style={styles.filterGroup}>
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
          <div style={styles.filterGroup}>
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
          <div style={styles.filterRow}>
            <div style={styles.filterGroup}>
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
            <div style={styles.filterGroup}>
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
            <div style={styles.filterGroup}>
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
        <div style={styles.grid}>
          {filteredWheels.map(wheel => (
            <div
              key={wheel.id}
              style={{
                ...styles.card,
                ...(wheel.is_available ? {} : styles.cardTaken)
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
                <tr key={wheel.id} style={wheel.is_available ? {} : styles.rowTaken}>
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
          <h3 style={styles.contactsTitle}>📞 מנהלי התחנה - יצירת קשר</h3>
          <div style={styles.contactsGrid}>
            {station.wheel_station_managers.map(manager => (
              <div key={manager.id} style={styles.contactCard}>
                <div style={styles.contactAvatar}>👤</div>
                <div style={styles.contactInfo}>
                  <div style={styles.contactName}>{manager.full_name}</div>
                  <div style={styles.contactRole}>{manager.role}</div>
                  <a href={`tel:${manager.phone}`} style={styles.contactPhone}>
                    📱 {manager.phone}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <footer style={styles.footer}>
        <Link href="/wheels" style={styles.footerLink}>← חזרה לרשימת התחנות</Link>
      </footer>
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
  backBtn: {
    color: '#a0aec0',
    textDecoration: 'none',
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
    padding: '20px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '16px',
  },
  contactsTitle: {
    color: '#f59e0b',
    marginBottom: '20px',
  },
  contactsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '15px',
  },
  contactCard: {
    display: 'flex',
    gap: '15px',
    padding: '15px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
  },
  contactAvatar: {
    fontSize: '2.5rem',
  },
  contactInfo: {},
  contactName: {
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  contactRole: {
    color: '#a0aec0',
    fontSize: '0.85rem',
    marginBottom: '8px',
  },
  contactPhone: {
    color: '#10b981',
    textDecoration: 'none',
  },
  footer: {
    textAlign: 'center',
    marginTop: '40px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
  footerLink: {
    color: '#a0aec0',
    textDecoration: 'none',
  },
}
