'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Circle, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useRouter } from 'next/navigation'

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface Cabinet {
  id: string
  name: string
  public_lat: number
  public_lng: number
  manager_name?: string
  manager_phone?: string
}

interface CabinetsMapProps {
  onCabinetClick?: (cabinetId: string) => void
}

// Component to handle map centering
function MapCenterController({
  userLocation,
  cabinets
}: {
  userLocation: [number, number] | null
  cabinets: Cabinet[]
}) {
  const map = useMap()

  useEffect(() => {
    if (userLocation) {
      map.setView(userLocation, 12)
    } else if (cabinets.length > 0) {
      // Center on Israel if no user location - adjusted for better view
      map.setView([31.5, 35.0], 8)
    }
  }, [userLocation, cabinets, map])

  return null
}

export default function CabinetsMap({ onCabinetClick }: CabinetsMapProps) {
  const router = useRouter()
  const [cabinets, setCabinets] = useState<Cabinet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)

  useEffect(() => {
    fetchCabinets()
    requestUserLocation()
  }, [])

  const fetchCabinets = async () => {
    try {
      const response = await fetch('/api/maps/cabinets')
      if (!response.ok) {
        throw new Error('Failed to fetch cabinets')
      }
      const data = await response.json()
      setCabinets(data.cabinets || [])
    } catch (err) {
      console.error('Error fetching cabinets:', err)
      setError('שגיאה בטעינת נתוני הארונות')
    } finally {
      setLoading(false)
    }
  }

  const requestUserLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('📍 User location:', position.coords.latitude, position.coords.longitude)
          console.log('📊 Accuracy:', position.coords.accuracy, 'meters')
          setUserLocation([position.coords.latitude, position.coords.longitude])
          setLocationError(null)
        },
        (error) => {
          console.log('Geolocation error:', error.code, error.message)
          let errorMsg = 'לא ניתן לקבל מיקום - המפה תוצג במרכז ישראל'

          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMsg = 'הרשאת מיקום נדחתה. אפשר גישה למיקום בהגדרות הדפדפן'
              break
            case error.POSITION_UNAVAILABLE:
              errorMsg = 'מידע מיקום לא זמין כרגע'
              break
            case error.TIMEOUT:
              errorMsg = 'פג זמן הבקשה למיקום'
              break
          }

          setLocationError(errorMsg)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )
    } else {
      setLocationError('הדפדפן לא תומך בזיהוי מיקום')
    }
  }

  const handleCircleClick = (cabinetId: string) => {
    if (onCabinetClick) {
      onCabinetClick(cabinetId)
    } else {
      router.push(`/city/${cabinetId}`)
    }
  }

  if (loading) {
    return (
      <div className="w-full h-[400px] sm:h-[500px] md:h-[600px] lg:h-[700px] flex items-center justify-center bg-gray-100 rounded-xl">
        <div className="text-center">
          <div className="text-4xl mb-2">🗺️</div>
          <p className="text-gray-600">טוען מפה...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-[400px] sm:h-[500px] md:h-[600px] lg:h-[700px] flex items-center justify-center bg-red-50 rounded-xl border-2 border-red-200">
        <div className="text-center">
          <div className="text-4xl mb-2">⚠️</div>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  if (cabinets.length === 0) {
    return (
      <div className="w-full h-[400px] sm:h-[500px] md:h-[600px] lg:h-[700px] flex items-center justify-center bg-yellow-50 rounded-xl border-2 border-yellow-200">
        <div className="text-center">
          <div className="text-4xl mb-2">📍</div>
          <p className="text-yellow-700">אין ארונות זמינים במפה כרגע</p>
        </div>
      </div>
    )
  }

  // Default center (Israel)
  const defaultCenter: [number, number] = [31.5, 34.75]

  return (
    <div className="w-full rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg">
      {/* Location status bar */}
      <div className="bg-blue-50 border-b-2 border-blue-200 p-2 flex items-center justify-between text-sm">
        <div className="text-blue-700">
          {userLocation ? (
            <span>✅ המיקום שלך מוצג במפה</span>
          ) : (
            <span>📍 לחץ כדי להציג את המיקום שלך</span>
          )}
        </div>
        <button
          onClick={requestUserLocation}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs font-semibold transition-all"
        >
          {userLocation ? '🔄 רענן מיקום' : '📍 הצג מיקום'}
        </button>
      </div>
      {locationError && (
        <div className="bg-yellow-50 border-b-2 border-yellow-200 p-3 text-center text-sm text-yellow-700">
          ℹ️ {locationError}
        </div>
      )}
      <MapContainer
        center={userLocation || defaultCenter}
        zoom={userLocation ? 12 : 8}
        style={{ height: '100%', width: '100%', minHeight: '400px' }}
        className="z-0 h-[400px] sm:h-[500px] md:h-[600px] lg:h-[700px]"
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapCenterController userLocation={userLocation} cabinets={cabinets} />

        {/* User location marker - Red pin style */}
        {userLocation && (
          <>
            {/* Outer glow circle */}
            <Circle
              center={userLocation}
              radius={100}
              pathOptions={{
                color: '#EF4444',
                fillColor: '#FEE2E2',
                fillOpacity: 0.3,
                weight: 0
              }}
            />
            {/* Inner red dot */}
            <Circle
              center={userLocation}
              radius={30}
              pathOptions={{
                color: '#DC2626',
                fillColor: '#EF4444',
                fillOpacity: 0.9,
                weight: 3
              }}
            >
              <Popup>
                <div className="text-center font-semibold">
                  <div className="text-2xl mb-1">📍</div>
                  <div className="text-red-600">המיקום שלך</div>
                </div>
              </Popup>
            </Circle>
          </>
        )}

        {/* Cabinet circles (750m radius) */}
        {cabinets.map((cabinet) => (
          <Circle
            key={cabinet.id}
            center={[cabinet.public_lat, cabinet.public_lng]}
            radius={750}
            pathOptions={{
              color: '#4F46E5',
              fillColor: '#818CF8',
              fillOpacity: 0.3,
              weight: 2
            }}
          >
            <Popup>
              <div className="text-center p-3 min-w-[220px]">
                <h3 className="font-bold text-xl text-gray-800 mb-2">
                  🏙️ {cabinet.name}
                </h3>
                {cabinet.manager_name && (
                  <p className="text-sm text-gray-600 mb-3">
                    👤 {cabinet.manager_name}
                  </p>
                )}
                <p className="text-xs text-gray-500 mb-4 bg-yellow-50 p-2 rounded-lg border border-yellow-200">
                  ⚠️ מיקום משוער בלבד (±750 מטר)
                </p>
                <button
                  onClick={() => handleCircleClick(cabinet.id)}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 hover:scale-105 shadow-lg"
                >
                  🎒 פתח בקשה לארון זה
                </button>
              </div>
            </Popup>
          </Circle>
        ))}
      </MapContainer>
    </div>
  )
}
