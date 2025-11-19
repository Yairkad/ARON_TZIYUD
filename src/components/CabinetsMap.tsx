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
    <div className="w-full rounded-xl overflow-hidden shadow-lg">
      {/* Clean location status bar */}
      <div className="bg-white border-b border-gray-200 p-3 flex items-center justify-between text-sm">
        <div className="text-gray-700 font-medium">
          {userLocation ? (
            <span className="text-red-600">📍 המיקום שלך מוצג במפה</span>
          ) : (
            <span className="text-gray-400">📍 לחץ להצגת מיקומך</span>
          )}
        </div>
        <button
          onClick={requestUserLocation}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
        >
          {userLocation ? 'רענן מיקום' : 'הצג מיקום'}
        </button>
      </div>
      {locationError && (
        <div className="bg-amber-50 border-b border-amber-200 p-2 text-center text-xs text-amber-700">
          {locationError}
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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
        />

        <MapCenterController userLocation={userLocation} cabinets={cabinets} />

        {/* User location marker - Red pin style like Google Maps */}
        {userLocation && (
          <>
            {/* Subtle outer pulse */}
            <Circle
              center={userLocation}
              radius={80}
              pathOptions={{
                color: '#DC2626',
                fillColor: '#FEE2E2',
                fillOpacity: 0.2,
                weight: 0
              }}
            />
            {/* Red pin dot */}
            <Circle
              center={userLocation}
              radius={20}
              pathOptions={{
                color: '#B91C1C',
                fillColor: '#DC2626',
                fillOpacity: 1,
                weight: 3
              }}
            >
              <Popup>
                <div className="text-center py-1">
                  <div className="text-sm font-medium text-red-600">📍 אתה נמצא כאן</div>
                </div>
              </Popup>
            </Circle>
          </>
        )}

        {/* Cabinet circles - Clean minimal style */}
        {cabinets.map((cabinet) => (
          <Circle
            key={cabinet.id}
            center={[cabinet.public_lat, cabinet.public_lng]}
            radius={750}
            pathOptions={{
              color: '#10B981',
              fillColor: '#34D399',
              fillOpacity: 0.15,
              weight: 2
            }}
          >
            <Popup>
              <div className="text-center p-2 min-w-[200px]">
                <h3 className="font-bold text-base text-gray-800 mb-1">
                  {cabinet.name}
                </h3>
                {cabinet.manager_name && (
                  <p className="text-xs text-gray-500 mb-2">
                    {cabinet.manager_name}
                  </p>
                )}
                <p className="text-[10px] text-gray-400 mb-3">
                  מיקום משוער ±750 מטר
                </p>
                <button
                  onClick={() => handleCircleClick(cabinet.id)}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
                >
                  פתח בקשה לארון זה
                </button>
              </div>
            </Popup>
          </Circle>
        ))}
      </MapContainer>
    </div>
  )
}
