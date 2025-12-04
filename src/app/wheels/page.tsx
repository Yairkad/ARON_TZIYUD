'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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

export default function WheelStationsPage() {
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
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
      <header style={styles.header}>
        <div style={styles.headerIcon}>⚫</div>
        <h1 style={styles.title}>תחנות השאלת גלגלים</h1>
        <p style={styles.subtitle}>בחר תחנה כדי לראות את המלאי הזמין</p>
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
        <Link href="/" style={styles.footerLink}>← חזרה לדף הראשי</Link>
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
    textAlign: 'center',
    marginBottom: '30px',
  },
  headerIcon: {
    fontSize: '4rem',
    marginBottom: '20px',
  },
  title: {
    fontSize: '2.5rem',
    marginBottom: '10px',
  },
  subtitle: {
    color: '#a0aec0',
    fontSize: '1.1rem',
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
  footerLink: {
    color: '#a0aec0',
    textDecoration: 'none',
  },
}
