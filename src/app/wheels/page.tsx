'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import toast, { Toaster } from 'react-hot-toast'
import { getDistricts, getDistrictColor, getDistrictName, District } from '@/lib/districts'

interface Station {
  id: string
  name: string
  address: string
  city_id: string
  district: string | null
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
  const [districts, setDistricts] = useState<District[]>([])

  // Search state
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null)
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [searchFilters, setSearchFilters] = useState({
    rim_size: '',
    bolt_count: '',
    bolt_spacing: '',
    district: '',
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

  // Add vehicle model modal state
  const [showAddModelModal, setShowAddModelModal] = useState(false)
  const [addModelForm, setAddModelForm] = useState({
    make: '',
    make_he: '',
    model: '',
    year_from: '',
    year_to: '',
    bolt_count: '',
    bolt_spacing: '',
    center_bore: '',
    rim_size: '',
    tire_size_front: ''
  })
  const [addModelLoading, setAddModelLoading] = useState(false)
  const [makeSuggestions, setMakeSuggestions] = useState<string[]>([])
  const [makeHeSuggestions, setMakeHeSuggestions] = useState<string[]>([])
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([])
  const [showMakeSuggestions, setShowMakeSuggestions] = useState(false)
  const [showMakeHeSuggestions, setShowMakeHeSuggestions] = useState(false)
  const [showModelSuggestions, setShowModelSuggestions] = useState(false)

  // Manager authentication for adding models
  const [isManagerLoggedIn, setIsManagerLoggedIn] = useState(false)
  const [managerPhone, setManagerPhone] = useState('')
  const [showManagerLoginModal, setShowManagerLoginModal] = useState(false)
  const [loginPhone, setLoginPhone] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [pendingVehicleData, setPendingVehicleData] = useState<any>(null)

  useEffect(() => {
    fetchStations()
    fetchDistrictsData()
    // Check if manager is logged in from localStorage
    const savedManager = localStorage.getItem('vehicle_db_manager')
    if (savedManager) {
      try {
        const { phone } = JSON.parse(savedManager)
        setIsManagerLoggedIn(true)
        setManagerPhone(phone)
      } catch {
        localStorage.removeItem('vehicle_db_manager')
      }
    }
  }, [])

  const fetchDistrictsData = async () => {
    try {
      const districtsData = await getDistricts()
      setDistricts(districtsData)
    } catch (err) {
      console.error('Error fetching districts:', err)
    }
  }

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
      if (searchFilters.district) params.append('district', searchFilters.district)
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
      district: '',
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
      // Search by PCD only (don't filter by rim_size) to show all compatible wheels
      if (data.wheel_fitment) {
        const params = new URLSearchParams()
        params.set('bolt_count', data.wheel_fitment.bolt_count.toString())
        params.set('bolt_spacing', data.wheel_fitment.bolt_spacing.toString())
        // Don't filter by rim_size - show all PCD-compatible wheels
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

  // Fetch autocomplete suggestions
  const fetchMakeSuggestions = async (value: string) => {
    if (value.length < 2) {
      setMakeSuggestions([])
      return
    }
    try {
      const response = await fetch(`/api/vehicle-models?make=${encodeURIComponent(value)}`)
      const data = await response.json()
      const uniqueMakes = [...new Set(data.vehicles.map((v: any) => v.make as string))]
      setMakeSuggestions(uniqueMakes.slice(0, 5) as string[])
    } catch {
      setMakeSuggestions([])
    }
  }

  const fetchMakeHeSuggestions = async (value: string) => {
    if (value.length < 2) {
      setMakeHeSuggestions([])
      return
    }
    try {
      const response = await fetch(`/api/vehicle-models?make=${encodeURIComponent(value)}`)
      const data = await response.json()
      const uniqueMakes = [...new Set(data.vehicles.map((v: any) => v.make_he as string))]
      setMakeHeSuggestions(uniqueMakes.slice(0, 5) as string[])
    } catch {
      setMakeHeSuggestions([])
    }
  }

  const fetchModelSuggestions = async (value: string) => {
    if (value.length < 2) {
      setModelSuggestions([])
      return
    }
    try {
      const response = await fetch(`/api/vehicle-models?model=${encodeURIComponent(value)}`)
      const data = await response.json()
      const uniqueModels = [...new Set(data.vehicles.map((v: any) => v.model as string))]
      setModelSuggestions(uniqueModels.slice(0, 5) as string[])
    } catch {
      setModelSuggestions([])
    }
  }

  // Manager login
  const handleManagerLogin = async () => {
    if (!loginPhone || !loginPassword) {
      toast.error('נא למלא טלפון וסיסמה')
      return
    }

    setLoginLoading(true)
    try {
      // Try to authenticate as wheel station manager or city manager
      const response = await fetch('/api/wheel-stations/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginPhone, password: loginPassword })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בהתחברות')
      }

      // Save to localStorage
      const locationName = data.manager?.station_name || data.manager?.city_name || ''
      localStorage.setItem('vehicle_db_manager', JSON.stringify({
        phone: loginPhone,
        name: data.manager?.full_name || '',
        location: locationName
      }))

      setIsManagerLoggedIn(true)
      setManagerPhone(loginPhone)
      setShowManagerLoginModal(false)
      setLoginPhone('')
      setLoginPassword('')

      const welcomeMsg = locationName
        ? `ברוך הבא ${data.manager?.full_name}, ${locationName}!`
        : `ברוך הבא, ${data.manager?.full_name || 'מנהל'}!`
      toast.success(welcomeMsg)

      // If there's pending vehicle data, open the add model form
      if (pendingVehicleData) {
        setAddModelForm({
          ...addModelForm,
          make: pendingVehicleData.make,
          make_he: pendingVehicleData.make_he,
          model: pendingVehicleData.model,
          year_from: pendingVehicleData.year_from,
          tire_size_front: pendingVehicleData.tire_size_front
        })
        setShowAddModelModal(true)
        setPendingVehicleData(null)
      }
    } catch (error: any) {
      toast.error(error.message || 'שגיאה בהתחברות')
    } finally {
      setLoginLoading(false)
    }
  }

  // Open add model modal - check if logged in first
  const handleOpenAddModel = (vehicleData: any) => {
    if (!isManagerLoggedIn) {
      // Save vehicle data and show login modal
      setPendingVehicleData(vehicleData)
      setShowManagerLoginModal(true)
    } else {
      // Already logged in, open add model form
      setAddModelForm({
        ...addModelForm,
        ...vehicleData
      })
      setShowAddModelModal(true)
    }
  }

  const handleAddVehicleModel = async () => {
    // Validate required fields
    if (!addModelForm.make || !addModelForm.make_he || !addModelForm.model ||
        !addModelForm.bolt_count || !addModelForm.bolt_spacing) {
      toast.error('נא למלא את כל השדות החובה')
      return
    }

    setAddModelLoading(true)

    try {
      const response = await fetch('/api/vehicle-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...addModelForm,
          added_by: managerPhone
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בהוספת הדגם')
      }

      toast.success('הדגם נוסף בהצלחה למאגר!')
      setShowAddModelModal(false)
      // Reset form
      setAddModelForm({
        make: '',
        make_he: '',
        model: '',
        year_from: '',
        year_to: '',
        bolt_count: '',
        bolt_spacing: '',
        center_bore: '',
        rim_size: '',
        tire_size_front: ''
      })
    } catch (error: any) {
      toast.error(error.message || 'שגיאה בהוספת הדגם')
    } finally {
      setAddModelLoading(false)
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
    <>
      <Toaster
        position="top-center"
        containerStyle={{
          top: 20,
        }}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #3b82f6',
            zIndex: 9999,
          },
        }}
      />
      <div style={styles.container}>
        <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.95); }
        }
        .suggestion-item:hover {
          background: #374151 !important;
        }
        .suggestion-item:last-child {
          border-bottom: none !important;
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
          .wheels-vehicle-modal {
            max-width: calc(100vw - 30px) !important;
            padding: 15px !important;
            max-height: 90vh !important;
          }
          .wheels-vehicle-modal .wheels-fitment-badges {
            flex-direction: column !important;
            gap: 8px !important;
          }
          .wheels-vehicle-modal .wheels-vehicle-info-details {
            flex-direction: column !important;
            gap: 5px !important;
          }
          .wheels-result-wheel-card {
            min-width: 80px !important;
            padding: 8px 10px !important;
          }
          .wheels-search-modal {
            padding: 15px !important;
            max-width: calc(100vw - 30px) !important;
            max-height: 90vh !important;
          }
          .wheels-add-model-modal {
            padding: 15px !important;
            max-width: calc(100vw - 30px) !important;
            max-height: 90vh !important;
          }
          .wheels-modal-title {
            font-size: 1.1rem !important;
          }
        }
      `}</style>
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
              {(station.cities?.name || station.district) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', justifyContent: 'flex-start' }}>
                  {station.cities?.name && (
                    <div style={styles.cityName}>{station.cities.name}</div>
                  )}
                  {station.district && (
                    <div style={{
                      display: 'inline-block',
                      padding: '2px 6px',
                      border: `1.5px solid ${getDistrictColor(station.district, districts)}`,
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      color: getDistrictColor(station.district, districts),
                      backgroundColor: `${getDistrictColor(station.district, districts)}15`,
                      whiteSpace: 'nowrap'
                    }}>
                      {getDistrictName(station.district, districts)}
                    </div>
                  )}
                </div>
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
          <div style={styles.modal} className="wheels-search-modal" onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle} className="wheels-modal-title">🔍 חיפוש גלגל</h3>
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

                  <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>מחוז</label>
                    <select
                      style={styles.filterSelect}
                      value={searchFilters.district}
                      onChange={e => setSearchFilters({...searchFilters, district: e.target.value})}
                    >
                      <option value="">כל המחוזות</option>
                      {districts.map(district => (
                        <option key={district.code} value={district.code}>{district.name}</option>
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
          <div style={styles.vehicleModal} className="wheels-vehicle-modal" onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle} className="wheels-modal-title">🚗 חיפוש לפי מספר רכב</h3>
              <button style={styles.closeBtn} onClick={closeVehicleModal}>✕</button>
            </div>

            {/* Beta warning */}
            <div style={styles.betaWarning}>
              ⚠️ פיצ'ר בפיתוח - יתכנו טעויות בזיהוי מידות הגלגל
            </div>

            {/* Search input */}
            <div style={styles.vehicleInputRow}>
              <input
                type="text"
                inputMode="numeric"
                value={vehiclePlate}
                onChange={e => setVehiclePlate(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleVehicleLookup()}
                placeholder="הזן מספר רישוי..."
                style={styles.vehicleInput}
                dir="ltr"
                autoFocus
              />
              <button
                onClick={handleVehicleLookup}
                disabled={vehicleLoading}
                style={styles.vehicleLookupBtn}
              >
                {vehicleLoading ? (
                  <span className="spinning-wheel">🛞</span>
                ) : '🔍'}
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
                  <div style={styles.vehicleInfoDetails} className="wheels-vehicle-info-details">
                    <span>📅 {vehicleResult.vehicle.year}</span>
                    <span style={{ direction: 'ltr' }}>🛞 {vehicleResult.vehicle.front_tire}</span>
                  </div>
                </div>

                {/* Wheel Fitment */}
                {vehicleResult.wheel_fitment ? (
                  <div style={styles.vehicleFitmentCard}>
                    <div style={styles.fitmentBadges} className="wheels-fitment-badges">
                      <span style={styles.pcdBadge}>PCD: {vehicleResult.wheel_fitment.pcd}</span>
                      {extractRimSize(vehicleResult.vehicle.front_tire) && (
                        <span style={styles.rimBadge}>{extractRimSize(vehicleResult.vehicle.front_tire)}"</span>
                      )}
                    </div>

                    {/* Search Results */}
                    {vehicleSearchResults && vehicleSearchResults.length > 0 ? (
                      <div style={styles.vehicleWheelResults}>
                        <div style={styles.vehicleResultsHeader}>
                          ✅ נמצאו {vehicleSearchResults.reduce((acc, r) => acc + r.availableCount, 0)} גלגלים עם PCD מתאים
                        </div>
                        <div style={styles.vehicleResultsNote}>
                          הגלגלים מסודרים לפי גודל חישוק. לרכב שלך מתאים {extractRimSize(vehicleResult.vehicle.front_tire)}"
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
                                  className="wheels-result-wheel-card"
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
                    <div style={styles.externalLinks}>
                      <a
                        href={`https://www.wheel-size.com/size/${vehicleResult.vehicle.model.toLowerCase()}/${vehicleResult.vehicle.year}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.wheelSizeLink}
                      >
                        חפש ב-wheel-size.com ↗
                      </a>
                      <a
                        href="http://wheelfitment.eu"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.wheelSizeLink}
                      >
                        חפש ב-wheelfitment.eu ↗
                      </a>
                    </div>
                    <button
                      onClick={() => handleOpenAddModel({
                        make: vehicleResult.vehicle.manufacturer.toLowerCase(),
                        make_he: vehicleResult.vehicle.manufacturer,
                        model: vehicleResult.vehicle.model.toLowerCase(),
                        year_from: vehicleResult.vehicle.year.toString(),
                        tire_size_front: vehicleResult.vehicle.front_tire
                      })}
                      style={styles.addModelBtn}
                    >
                      ➕ הוסף דגם זה למאגר
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manager Login Modal */}
      {showManagerLoginModal && (
        <div style={styles.modalOverlay} onClick={() => setShowManagerLoginModal(false)}>
          <div style={styles.vehicleModal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>🔐 התחברות מנהל</h3>
              <button style={styles.closeBtn} onClick={() => setShowManagerLoginModal(false)}>✕</button>
            </div>

            <div style={{ padding: '20px 0' }}>
              <p style={{ color: '#d1d5db', marginBottom: '20px', textAlign: 'center' }}>
                כדי להוסיף דגם רכב למאגר, יש להתחבר כמנהל
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={styles.formLabel}>שם משתמש</label>
                  <input
                    type="text"
                    value={loginPhone}
                    onChange={e => setLoginPhone(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleManagerLogin()}
                    placeholder="הזן שם משתמש"
                    style={styles.formInput}
                  />
                </div>

                <div>
                  <label style={styles.formLabel}>סיסמה</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleManagerLogin()}
                    placeholder="הזן סיסמה"
                    style={styles.formInput}
                  />
                </div>

                <button
                  onClick={handleManagerLogin}
                  disabled={loginLoading}
                  style={{
                    ...styles.submitBtn,
                    opacity: loginLoading ? 0.6 : 1,
                    cursor: loginLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loginLoading ? 'מתחבר...' : '🔓 התחבר'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Vehicle Model Modal */}
      {showAddModelModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddModelModal(false)}>
          <div style={styles.addModelModal} className="wheels-add-model-modal" onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle} className="wheels-modal-title">➕ הוסף דגם רכב למאגר</h3>
              <button style={styles.closeBtn} onClick={() => setShowAddModelModal(false)}>✕</button>
            </div>

            <div style={styles.addModelForm}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>יצרן (עברית) <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={addModelForm.make_he}
                      onChange={e => {
                        setAddModelForm({ ...addModelForm, make_he: e.target.value })
                        fetchMakeHeSuggestions(e.target.value)
                        setShowMakeHeSuggestions(true)
                      }}
                      onFocus={() => addModelForm.make_he.length >= 2 && setShowMakeHeSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowMakeHeSuggestions(false), 200)}
                      placeholder="טויוטה"
                      style={styles.formInput}
                    />
                    {showMakeHeSuggestions && makeHeSuggestions.length > 0 && (
                      <div style={styles.suggestionsList}>
                        {makeHeSuggestions.map((suggestion, i) => (
                          <div
                            key={i}
                            className="suggestion-item"
                            style={styles.suggestionItem}
                            onClick={() => {
                              setAddModelForm({ ...addModelForm, make_he: suggestion })
                              setShowMakeHeSuggestions(false)
                            }}
                          >
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>יצרן (אנגלית) <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={addModelForm.make}
                      onChange={e => {
                        setAddModelForm({ ...addModelForm, make: e.target.value })
                        fetchMakeSuggestions(e.target.value)
                        setShowMakeSuggestions(true)
                      }}
                      onFocus={() => addModelForm.make.length >= 2 && setShowMakeSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowMakeSuggestions(false), 200)}
                      placeholder="toyota"
                      style={styles.formInput}
                    />
                    {showMakeSuggestions && makeSuggestions.length > 0 && (
                      <div style={styles.suggestionsList}>
                        {makeSuggestions.map((suggestion, i) => (
                          <div
                            key={i}
                            className="suggestion-item"
                            style={styles.suggestionItem}
                            onClick={() => {
                              setAddModelForm({ ...addModelForm, make: suggestion })
                              setShowMakeSuggestions(false)
                            }}
                          >
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>דגם <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={addModelForm.model}
                    onChange={e => {
                      setAddModelForm({ ...addModelForm, model: e.target.value })
                      fetchModelSuggestions(e.target.value)
                      setShowModelSuggestions(true)
                    }}
                    onFocus={() => addModelForm.model.length >= 2 && setShowModelSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowModelSuggestions(false), 200)}
                    placeholder="corolla"
                    style={styles.formInput}
                  />
                  {showModelSuggestions && modelSuggestions.length > 0 && (
                    <div style={styles.suggestionsList}>
                      {modelSuggestions.map((suggestion, i) => (
                        <div
                          key={i}
                          className="suggestion-item"
                          style={styles.suggestionItem}
                          onClick={() => {
                            setAddModelForm({ ...addModelForm, model: suggestion })
                            setShowModelSuggestions(false)
                          }}
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>שנה מ-</label>
                  <input
                    type="number"
                    value={addModelForm.year_from}
                    onChange={e => setAddModelForm({ ...addModelForm, year_from: e.target.value })}
                    placeholder="2015"
                    style={styles.formInput}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>שנה עד</label>
                  <input
                    type="number"
                    value={addModelForm.year_to}
                    onChange={e => setAddModelForm({ ...addModelForm, year_to: e.target.value })}
                    placeholder="2020 (ריק = עד היום)"
                    style={styles.formInput}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>כמות ברגים <span style={{ color: '#ef4444' }}>*</span></label>
                  <select
                    value={addModelForm.bolt_count}
                    onChange={e => setAddModelForm({ ...addModelForm, bolt_count: e.target.value })}
                    style={styles.formInput}
                  >
                    <option value="">בחר...</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>PCD (מרווח ברגים) <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="number"
                    step="0.1"
                    value={addModelForm.bolt_spacing}
                    onChange={e => setAddModelForm({ ...addModelForm, bolt_spacing: e.target.value })}
                    placeholder="114.3"
                    style={styles.formInput}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Center Bore</label>
                  <input
                    type="number"
                    step="0.1"
                    value={addModelForm.center_bore}
                    onChange={e => setAddModelForm({ ...addModelForm, center_bore: e.target.value })}
                    placeholder="60.1"
                    style={styles.formInput}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>גודל חישוק</label>
                  <input
                    type="text"
                    value={addModelForm.rim_size}
                    onChange={e => setAddModelForm({ ...addModelForm, rim_size: e.target.value })}
                    placeholder="15, 16, 17"
                    style={styles.formInput}
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>גודל צמיג קדמי</label>
                <input
                  type="text"
                  value={addModelForm.tire_size_front}
                  onChange={e => setAddModelForm({ ...addModelForm, tire_size_front: e.target.value })}
                  placeholder="195/60R15"
                  style={styles.formInput}
                />
              </div>

              <div style={styles.formActions}>
                <button
                  onClick={handleAddVehicleModel}
                  disabled={addModelLoading}
                  style={styles.submitBtn}
                >
                  {addModelLoading ? 'מוסיף...' : '✅ הוסף למאגר'}
                </button>
                <button
                  onClick={() => setShowAddModelModal(false)}
                  style={styles.cancelBtn}
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
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
    padding: '15px',
    overflow: 'auto',
  },
  modal: {
    background: '#1e293b',
    borderRadius: '12px',
    padding: '18px',
    width: '100%',
    maxWidth: '480px',
    maxHeight: '80vh',
    overflowY: 'auto',
    margin: '0',
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
    borderRadius: '12px',
    padding: '18px',
    width: '100%',
    maxWidth: '480px',
    maxHeight: '80vh',
    overflowY: 'auto',
    margin: '0',
  },
  betaWarning: {
    background: 'rgba(251, 191, 36, 0.15)',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    color: '#fbbf24',
    padding: '10px 15px',
    borderRadius: '10px',
    textAlign: 'center',
    fontSize: '0.85rem',
    marginBottom: '15px',
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
    marginBottom: '5px',
    fontSize: '0.95rem',
  },
  vehicleResultsNote: {
    color: '#a0aec0',
    textAlign: 'center',
    marginBottom: '12px',
    fontSize: '0.8rem',
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
  externalLinks: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '5px',
  },
  addModelBtn: {
    marginTop: '15px',
    padding: '12px 20px',
    background: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  addModelModal: {
    background: '#1f2937',
    borderRadius: '12px',
    padding: '18px',
    maxWidth: '520px',
    width: '100%',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
    margin: '0',
  },
  addModelForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  formLabel: {
    fontSize: '0.9rem',
    color: '#d1d5db',
    fontWeight: '500',
  },
  formInput: {
    padding: '10px',
    background: '#374151',
    border: '1px solid #4b5563',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '1rem',
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '10px',
  },
  submitBtn: {
    flex: 1,
    padding: '12px',
    background: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    background: '#6b7280',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  suggestionsList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: '#1f2937',
    border: '1px solid #4b5563',
    borderRadius: '8px',
    marginTop: '4px',
    maxHeight: '200px',
    overflowY: 'auto',
    zIndex: 1000,
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
  },
  suggestionItem: {
    padding: '10px 12px',
    cursor: 'pointer',
    borderBottom: '1px solid #374151',
    color: '#d1d5db',
    fontSize: '0.95rem',
  },
}
