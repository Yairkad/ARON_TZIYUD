'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import toast, { Toaster } from 'react-hot-toast'

interface Station {
  id: string
  name: string
  address: string
  city_id: string
  cities: { name: string } | null
  wheel_station_managers: Manager[]
  totalWheels: number
  availableWheels: number
}

interface Manager {
  id: string
  full_name: string
  phone: string
  role: string
  is_primary: boolean
}

interface SearchResult {
  station: {
    id: string
    name: string
    address: string
    city: string | null
  }
  wheels: {
    id: string
    wheel_number: string
    rim_size: string
    bolt_count: number
    bolt_spacing: number
    is_donut: boolean
    is_available: boolean
  }[]
  availableCount: number
  totalCount: number
}

interface FilterOptions {
  rim_sizes: string[]
  bolt_counts: number[]
  bolt_spacings: number[]
}

export default function WheelStationsPage() {
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Search state
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null)
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [searchFilters, setSearchFilters] = useState({
    rim_size: '',
    bolt_count: '',
    bolt_spacing: '',
    available_only: true
  })

  // Vehicle lookup state
  const [showVehicleModal, setShowVehicleModal] = useState(false)
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [vehicleLoading, setVehicleLoading] = useState(false)
  const [vehicleResult, setVehicleResult] = useState<{
    vehicle: {
      manufacturer: string
      model: string
      year: number
      color: string
      front_tire: string
    }
    wheel_fitment: {
      pcd: string
      bolt_count: number
      bolt_spacing: number
      center_bore?: number
    } | null
  } | null>(null)
  const [vehicleError, setVehicleError] = useState<string | null>(null)
  const [vehicleSearchResults, setVehicleSearchResults] = useState<SearchResult[] | null>(null)

  useEffect(() => {
    fetchStations()
  }, [])

  const fetchStations = async () => {
    try {
      const response = await fetch('/api/wheel-stations')
      if (!response.ok) throw new Error('Failed to fetch stations')
      const data = await response.json()
      setStations(data.stations || [])
    } catch (err) {
      setError('שגיאה בטעינת התחנות')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    // Need at least one filter
    if (!searchFilters.rim_size && !searchFilters.bolt_count && !searchFilters.bolt_spacing) {
      toast.error('נא לבחור לפחות פילטר אחד')
      return
    }

    setSearchLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchFilters.rim_size) params.append('rim_size', searchFilters.rim_size)
      if (searchFilters.bolt_count) params.append('bolt_count', searchFilters.bolt_count)
      if (searchFilters.bolt_spacing) params.append('bolt_spacing', searchFilters.bolt_spacing)
      if (searchFilters.available_only) params.append('available_only', 'true')

      const response = await fetch(`/api/wheel-stations/search?${params}`)
      if (!response.ok) throw new Error('Failed to search')
      const data = await response.json()
      setSearchResults(data.results)
      setFilterOptions(data.filterOptions)
    } catch (err) {
      console.error(err)
      toast.error('שגיאה בחיפוש')
    } finally {
      setSearchLoading(false)
    }
  }

  const openSearchModal = async () => {
    setShowSearchModal(true)
    setSearchResults(null)
    // Fetch filter options
    if (!filterOptions) {
      try {
        const response = await fetch('/api/wheel-stations/search?')
        if (response.ok) {
          const data = await response.json()
          setFilterOptions(data.filterOptions)
        }
      } catch (err) {
        console.error(err)
      }
    }
  }

  const closeSearchModal = () => {
    setShowSearchModal(false)
    setSearchResults(null)
    setSearchFilters({
      rim_size: '',
      bolt_count: '',
      bolt_spacing: '',
      available_only: true
    })
  }

  // Vehicle lookup functions
  const openVehicleModal = () => {
    setShowVehicleModal(true)
    setVehicleResult(null)
    setVehicleError(null)
    setVehicleSearchResults(null)
    setVehiclePlate('')
  }

  const closeVehicleModal = () => {
    setShowVehicleModal(false)
    setVehicleResult(null)
    setVehicleError(null)
    setVehicleSearchResults(null)
    setVehiclePlate('')
  }

  // Extract rim size from tire string
  const extractRimSize = (tire: string | null | undefined): number | null => {
    if (!tire) return null
    const match = tire.match(/R(\d+)/i)
    return match ? parseInt(match[1]) : null
  }

  const handleVehicleLookup = async () => {
    if (!vehiclePlate.trim()) {
      toast.error('נא להזין מספר רישוי')
      return
    }

    setVehicleLoading(true)
    setVehicleError(null)
    setVehicleResult(null)
    setVehicleSearchResults(null)

    try {
      const response = await fetch(`/api/vehicle/lookup?plate=${encodeURIComponent(vehiclePlate)}`)
      const data = await response.json()

      if (!response.ok) {
        setVehicleError(data.error || 'שגיאה בחיפוש')
        return
      }

      setVehicleResult(data)

      // If we have wheel fitment, search for matching wheels
      if (data.wheel_fitment) {
        const rimSize = extractRimSize(data.vehicle.front_tire)
        const params = new URLSearchParams()
        params.set('bolt_count', data.wheel_fitment.bolt_count.toString())
        params.set('bolt_spacing', data.wheel_fitment.bolt_spacing.toString())
        if (rimSize) params.set('rim_size', rimSize.toString())
        params.set('available_only', 'true')

        const searchResponse = await fetch(`/api/wheel-stations/search?${params}`)
        if (searchResponse.ok) {
          const searchData = await searchResponse.json()
          setVehicleSearchResults(searchData.results)
        }
      }
    } catch {
      setVehicleError('שגיאה בחיבור לשרת')
    } finally {
      setVehicleLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <img
            src="/logo.wheels.png"
            alt="טוען..."
            style={styles.loadingLogo}
          />
          <p>טוען תחנות...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <p>❌ {error}</p>
          <button onClick={fetchStations} style={styles.retryBtn}>נסה שוב</button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.95); }
        }
        @media (max-width: 600px) {
          .wheels-search-btn {
            padding: 12px 20px !important;
            font-size: 0.9rem !important;
          }
          .wheels-header-title {
            font-size: 1.8rem !important;
          }
          .wheels-header-icon {
            width: 90px !important;
            height: 90px !important;
          }
          .wheels-filter-grid {
            grid-template-columns: 1fr !important;
          }
          .wheels-admin-link {
            padding: 10px 16px !important;
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
            iconTheme: { primary: '#10b981', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
      />
      <header style={styles.header}>
        <img
          src="/logo.wheels.png"
          alt="לוגו גלגלים"
          style={styles.headerLogo}
          className="wheels-header-icon"
        />
        <h1 style={styles.title} className="wheels-header-title">תחנות השאלת גלגלים</h1>
        <p style={styles.subtitle}>בחר תחנה כדי לראות את המלאי הזמין</p>

        {/* Search Buttons */}
        <div style={styles.searchBtnsRow}>
          <button style={styles.searchBtn} className="wheels-search-btn" onClick={openSearchModal}>
            🔍 חיפוש לפי מפרט
          </button>
          <button style={styles.vehicleSearchBtn} className="wheels-search-btn" onClick={openVehicleModal}>
            🚗 חיפוש לפי מספר רכב
          </button>
        </div>
      </header>

      {stations.length === 0 ? (
        <div style={styles.empty}>
          <p>אין תחנות זמינות כרגע</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {stations.map(station => (
            <Link
              key={station.id}
              href={`/wheels/${station.id}`}
              style={styles.card}
            >
              <h3 style={styles.cardTitle}>
                🏙️ {station.name}
              </h3>
              {station.address && (
                <div style={styles.address}>📍 {station.address}</div>
              )}
              {station.cities?.name && (
                <div style={styles.cityName}>{station.cities.name}</div>
              )}
              <div style={styles.stats}>
                <div style={styles.stat}>
                  <div style={styles.statValue}>{station.totalWheels}</div>
                  <div style={styles.statLabel}>סה"כ גלגלים</div>
                </div>
                <div style={styles.stat}>
                  <div style={{...styles.statValue, color: '#10b981'}}>{station.availableWheels}</div>
                  <div style={styles.statLabel}>זמינים</div>
                </div>
              </div>
              {station.wheel_station_managers.length > 0 && (
                <div style={styles.managers}>
                  📞 {station.wheel_station_managers.length} אנשי קשר
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      <footer style={styles.footer}>
        <Link href="/wheels/admin" style={styles.adminLink} className="wheels-admin-link">⚙️ ניהול</Link>
      </footer>

      {/* Search Modal */}
      {showSearchModal && (
        <div style={styles.modalOverlay} onClick={closeSearchModal}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>🔍 חיפוש גלגל</h3>
              <button style={styles.closeBtn} onClick={closeSearchModal}>✕</button>
            </div>

            {!searchResults ? (
              <>
                <p style={styles.modalSubtitle}>בחר מפרט לחיפוש בכל התחנות</p>

                <div style={styles.filterGrid} className="wheels-filter-grid">
                  <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>גודל ג'אנט</label>
                    <select
                      style={styles.filterSelect}
                      value={searchFilters.rim_size}
                      onChange={e => setSearchFilters({...searchFilters, rim_size: e.target.value})}
                    >
                      <option value="">בחר...</option>
                      {filterOptions?.rim_sizes.map(size => (
                        <option key={size} value={size}>{size}"</option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>כמות ברגים</label>
                    <select
                      style={styles.filterSelect}
                      value={searchFilters.bolt_count}
                      onChange={e => setSearchFilters({...searchFilters, bolt_count: e.target.value})}
                    >
                      <option value="">בחר...</option>
                      {filterOptions?.bolt_counts.map(count => (
                        <option key={count} value={count}>{count}</option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>מרווח ברגים</label>
                    <select
                      style={styles.filterSelect}
                      value={searchFilters.bolt_spacing}
                      onChange={e => setSearchFilters({...searchFilters, bolt_spacing: e.target.value})}
                    >
                      <option value="">בחר...</option>
                      {filterOptions?.bolt_spacings.map(spacing => (
                        <option key={spacing} value={spacing}>{spacing}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    id="available_only"
                    checked={searchFilters.available_only}
                    onChange={e => setSearchFilters({...searchFilters, available_only: e.target.checked})}
                  />
                  <label htmlFor="available_only" style={styles.checkboxLabel}>הצג רק זמינים</label>
                </div>

                <button
                  style={styles.searchSubmitBtn}
                  onClick={handleSearch}
                  disabled={searchLoading}
                >
                  {searchLoading ? 'מחפש...' : '🔍 חפש'}
                </button>
              </>
            ) : (
              <>
                <button style={styles.backToFiltersBtn} onClick={() => setSearchResults(null)}>
                  ← חזרה לסינון
                </button>

                {searchResults.length === 0 ? (
                  <div style={styles.noResults}>
                    <p>😕 לא נמצאו גלגלים מתאימים</p>
                    <p style={styles.noResultsHint}>נסה לשנות את הפילטרים</p>
                  </div>
                ) : (
                  <div style={styles.resultsList}>
                    <div style={styles.resultsHeader}>
                      נמצאו {searchResults.reduce((acc, r) => acc + r.totalCount, 0)} גלגלים ב-{searchResults.length} תחנות
                    </div>

                    {searchResults.map(result => (
                      <div key={result.station.id} style={styles.resultStationGroup}>
                        <div style={styles.resultStationHeader}>
                          <div style={styles.resultStationName}>🏙️ {result.station.name}</div>
                          {result.station.city && (
                            <div style={styles.resultCityBadge}>{result.station.city}</div>
                          )}
                        </div>
                        {result.station.address && (
                          <div style={styles.resultAddress}>📍 {result.station.address}</div>
                        )}
                        <div style={styles.resultWheelsList}>
                          {result.wheels.map(wheel => (
                            <Link
                              key={wheel.id}
                              href={`/wheels/${result.station.id}#wheel-${wheel.wheel_number}`}
                              style={{
                                ...styles.resultWheelCard,
                                ...(wheel.is_available ? {} : styles.resultWheelTaken)
                              }}
                              onClick={closeSearchModal}
                            >
                              <div style={styles.resultWheelNumber}>#{wheel.wheel_number}</div>
                              <div style={styles.resultWheelSpecs}>
                                <span>{wheel.rim_size}"</span>
                                <span>{wheel.bolt_count}×{wheel.bolt_spacing}</span>
                                {wheel.is_donut && <span style={styles.resultDonutBadge}>דונאט</span>}
                              </div>
                              <div style={{
                                ...styles.resultWheelStatus,
                                color: wheel.is_available ? '#10b981' : '#ef4444'
                              }}>
                                {wheel.is_available ? '✅ זמין' : '🔴 מושאל'}
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Vehicle Lookup Modal */}
      {showVehicleModal && (
        <div style={styles.modalOverlay} onClick={closeVehicleModal}>
          <div style={styles.vehicleModal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>🚗 חיפוש לפי מספר רכב</h3>
              <button style={styles.closeBtn} onClick={closeVehicleModal}>✕</button>
            </div>

            {/* Search input */}
            <div style={styles.vehicleInputRow}>
              <input
                type="text"
                value={vehiclePlate}
                onChange={e => setVehiclePlate(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleVehicleLookup()}
                placeholder="הזן מספר רישוי..."
                style={styles.vehicleInput}
                dir="ltr"
              />
              <button
                onClick={handleVehicleLookup}
                disabled={vehicleLoading}
                style={styles.vehicleLookupBtn}
              >
                {vehicleLoading ? '...' : '🔍'}
              </button>
            </div>

            {/* Error */}
            {vehicleError && (
              <div style={styles.vehicleError}>❌ {vehicleError}</div>
            )}

            {/* Vehicle Result */}
            {vehicleResult && (
              <div style={styles.vehicleResultSection}>
                {/* Vehicle Info */}
                <div style={styles.vehicleInfoCard}>
                  <div style={styles.vehicleInfoTitle}>
                    {vehicleResult.vehicle.manufacturer} {vehicleResult.vehicle.model}
                  </div>
                  <div style={styles.vehicleInfoDetails}>
                    <span>📅 {vehicleResult.vehicle.year}</span>
                    <span>🎨 {vehicleResult.vehicle.color}</span>
                  </div>
                </div>

                {/* Wheel Fitment */}
                {vehicleResult.wheel_fitment ? (
                  <div style={styles.vehicleFitmentCard}>
                    <div style={styles.fitmentBadges}>
                      <span style={styles.pcdBadge}>PCD: {vehicleResult.wheel_fitment.pcd}</span>
                      {extractRimSize(vehicleResult.vehicle.front_tire) && (
                        <span style={styles.rimBadge}>{extractRimSize(vehicleResult.vehicle.front_tire)}"</span>
                      )}
                    </div>

                    {/* Search Results */}
                    {vehicleSearchResults && vehicleSearchResults.length > 0 ? (
                      <div style={styles.vehicleWheelResults}>
                        <div style={styles.vehicleResultsHeader}>
                          ✅ נמצאו {vehicleSearchResults.reduce((acc, r) => acc + r.availableCount, 0)} גלגלים מתאימים
                        </div>
                        {vehicleSearchResults.map(result => (
                          <div key={result.station.id} style={styles.resultStationGroup}>
                            <div style={styles.resultStationHeader}>
                              <div style={styles.resultStationName}>🏙️ {result.station.name}</div>
                              {result.station.city && (
                                <div style={styles.resultCityBadge}>{result.station.city}</div>
                              )}
                            </div>
                            <div style={styles.resultWheelsList}>
                              {result.wheels.filter(w => w.is_available).map(wheel => (
                                <Link
                                  key={wheel.id}
                                  href={`/wheels/${result.station.id}#wheel-${wheel.wheel_number}`}
                                  style={styles.resultWheelCard}
                                  onClick={closeVehicleModal}
                                >
                                  <div style={styles.resultWheelNumber}>#{wheel.wheel_number}</div>
                                  <div style={styles.resultWheelSpecs}>
                                    <span>{wheel.rim_size}"</span>
                                    {wheel.is_donut && <span style={styles.resultDonutBadge}>דונאט</span>}
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : vehicleSearchResults && vehicleSearchResults.length === 0 ? (
                      <div style={styles.noVehicleResults}>
                        😕 לא נמצאו גלגלים מתאימים במלאי
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div style={styles.noFitmentCard}>
                    ⚠️ לא נמצאו מידות גלגל לדגם זה במאגר
                    <a
                      href={`https://www.wheel-size.com/size/${vehicleResult.vehicle.model.toLowerCase()}/${vehicleResult.vehicle.year}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.wheelSizeLink}
                    >
                      חפש ב-wheel-size.com ↗
                    </a>
                  </div>
                )}
              </div>
            )}
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
    textAlign: 'center',
    marginBottom: '30px',
  },
  headerIcon: {
    fontSize: '4rem',
    marginBottom: '20px',
  },
  headerLogo: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    objectFit: 'cover',
    marginBottom: '20px',
    border: '3px solid #6b7280',
    boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
    display: 'block',
    margin: '0 auto 20px',
  },
  loadingLogo: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    objectFit: 'cover',
    marginBottom: '20px',
    border: '3px solid #6b7280',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  title: {
    fontSize: '2.5rem',
    marginBottom: '10px',
  },
  subtitle: {
    color: '#a0aec0',
    fontSize: '1.1rem',
    marginBottom: '20px',
  },
  searchBtnsRow: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  searchBtn: {
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: 'white',
    border: 'none',
    padding: '14px 28px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  vehicleSearchBtn: {
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    padding: '14px 28px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    textDecoration: 'none',
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
    animation: 'spin 1s linear infinite',
  },
  error: {
    textAlign: 'center',
    padding: '40px',
  },
  retryBtn: {
    marginTop: '20px',
    padding: '10px 30px',
    background: '#f59e0b',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  empty: {
    textAlign: 'center',
    padding: '60px',
    color: '#a0aec0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  card: {
    background: 'linear-gradient(145deg, #2d3748, #1a202c)',
    borderRadius: '16px',
    padding: '25px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    textDecoration: 'none',
    color: '#fff',
    border: '2px solid transparent',
    display: 'block',
  },
  cardTitle: {
    fontSize: '1.3rem',
    marginBottom: '10px',
    color: '#f59e0b',
  },
  address: {
    color: '#a0aec0',
    fontSize: '0.9rem',
    marginBottom: '5px',
  },
  cityName: {
    color: '#718096',
    fontSize: '0.85rem',
    marginBottom: '15px',
  },
  stats: {
    display: 'flex',
    justifyContent: 'space-around',
    padding: '15px 0',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  stat: {
    textAlign: 'center',
  },
  statValue: {
    fontSize: '1.8rem',
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: '0.85rem',
    color: '#a0aec0',
  },
  managers: {
    marginTop: '15px',
    padding: '10px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
    textAlign: 'center',
    color: '#a0aec0',
    fontSize: '0.9rem',
  },
  footer: {
    textAlign: 'center',
    marginTop: '40px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
  adminLink: {
    color: '#f59e0b',
    textDecoration: 'none',
    fontSize: '0.9rem',
  },
  // Modal styles
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
    maxWidth: '450px',
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  modalTitle: {
    color: '#f59e0b',
    margin: 0,
    fontSize: '1.3rem',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#a0aec0',
    fontSize: '1.5rem',
    cursor: 'pointer',
  },
  modalSubtitle: {
    color: '#a0aec0',
    marginBottom: '20px',
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '15px',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  filterLabel: {
    color: '#a0aec0',
    fontSize: '0.8rem',
  },
  filterSelect: {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #4a5568',
    background: '#2d3748',
    color: 'white',
    fontSize: '0.9rem',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px',
  },
  checkboxLabel: {
    color: '#a0aec0',
    fontSize: '0.9rem',
  },
  searchSubmitBtn: {
    width: '100%',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    padding: '14px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1rem',
  },
  backToFiltersBtn: {
    background: 'transparent',
    border: 'none',
    color: '#3b82f6',
    cursor: 'pointer',
    marginBottom: '15px',
    fontSize: '0.9rem',
  },
  noResults: {
    textAlign: 'center',
    padding: '30px',
  },
  noResultsHint: {
    color: '#a0aec0',
    fontSize: '0.9rem',
  },
  resultsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  resultsHeader: {
    color: '#10b981',
    fontWeight: 'bold',
    marginBottom: '10px',
    textAlign: 'center',
  },
  resultCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '15px',
    textDecoration: 'none',
    color: '#fff',
    display: 'block',
    border: '1px solid transparent',
    transition: 'all 0.2s',
  },
  resultStationInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '5px',
  },
  resultStationGroup: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    padding: '12px',
    marginBottom: '12px',
  },
  resultStationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '5px',
  },
  resultStationName: {
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  resultCityBadge: {
    background: 'rgba(59, 130, 246, 0.2)',
    color: '#60a5fa',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '0.8rem',
  },
  resultAddress: {
    color: '#a0aec0',
    fontSize: '0.85rem',
    marginBottom: '10px',
  },
  resultWheelsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  resultWheelCard: {
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '8px',
    padding: '10px 14px',
    textDecoration: 'none',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: '100px',
    transition: 'all 0.2s',
  },
  resultWheelTaken: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    opacity: 0.7,
  },
  resultWheelNumber: {
    fontWeight: 'bold',
    fontSize: '1.1rem',
    color: '#f59e0b',
  },
  resultWheelSpecs: {
    display: 'flex',
    gap: '6px',
    fontSize: '0.8rem',
    color: '#a0aec0',
  },
  resultDonutBadge: {
    background: 'rgba(168, 85, 247, 0.3)',
    color: '#a855f7',
    padding: '1px 5px',
    borderRadius: '4px',
    fontSize: '0.7rem',
  },
  resultWheelStatus: {
    fontSize: '0.8rem',
    fontWeight: 'bold',
  },
  resultStats: {
    display: 'flex',
    gap: '15px',
  },
  resultAvailable: {
    color: '#10b981',
    fontWeight: 'bold',
  },
  resultTotal: {
    color: '#a0aec0',
    fontSize: '0.9rem',
  },
  // Vehicle modal styles
  vehicleModal: {
    background: '#1e293b',
    borderRadius: '16px',
    padding: '25px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '85vh',
    overflowY: 'auto',
  },
  vehicleInputRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '15px',
  },
  vehicleInput: {
    flex: 1,
    padding: '14px 18px',
    borderRadius: '10px',
    border: '2px solid #4a5568',
    background: '#2d3748',
    color: 'white',
    fontSize: '1.2rem',
    textAlign: 'center',
    letterSpacing: '2px',
  },
  vehicleLookupBtn: {
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    padding: '14px 20px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1.2rem',
  },
  vehicleError: {
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    padding: '12px',
    borderRadius: '10px',
    textAlign: 'center',
    marginBottom: '15px',
  },
  vehicleResultSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  vehicleInfoCard: {
    background: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '12px',
    padding: '15px',
    textAlign: 'center',
  },
  vehicleInfoTitle: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#60a5fa',
    marginBottom: '8px',
  },
  vehicleInfoDetails: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    color: '#a0aec0',
    fontSize: '0.9rem',
  },
  vehicleFitmentCard: {
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '12px',
    padding: '15px',
  },
  fitmentBadges: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '15px',
  },
  pcdBadge: {
    background: 'rgba(16, 185, 129, 0.3)',
    color: '#34d399',
    padding: '8px 16px',
    borderRadius: '20px',
    fontWeight: 'bold',
    fontSize: '1rem',
  },
  rimBadge: {
    background: 'rgba(59, 130, 246, 0.3)',
    color: '#60a5fa',
    padding: '8px 16px',
    borderRadius: '20px',
    fontWeight: 'bold',
    fontSize: '1rem',
  },
  vehicleWheelResults: {
    marginTop: '10px',
  },
  vehicleResultsHeader: {
    color: '#10b981',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '12px',
    fontSize: '0.95rem',
  },
  noVehicleResults: {
    textAlign: 'center',
    color: '#fbbf24',
    padding: '15px',
    background: 'rgba(251, 191, 36, 0.1)',
    borderRadius: '10px',
  },
  noFitmentCard: {
    background: 'rgba(251, 191, 36, 0.1)',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    color: '#fbbf24',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  wheelSizeLink: {
    color: '#60a5fa',
    textDecoration: 'none',
    fontSize: '0.9rem',
  },
}
