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
  const [searchQuery, setSearchQuery] = useState('')

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

  const filteredCabinets = cabinets.filter(cabinet =>
    cabinet.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="w-full h-[500px] md:h-[600px] flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100 rounded-2xl">
        <div className="text-center">
          <div className="text-5xl mb-3 animate-bounce">🧰</div>
          <p className="text-sky-700 font-medium">טוען מפת ארונות...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-[500px] md:h-[600px] flex items-center justify-center bg-red-50 rounded-2xl border-2 border-red-200">
        <div className="text-center">
          <div className="text-5xl mb-3">⚠️</div>
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      </div>
    )
  }

  if (cabinets.length === 0) {
    return (
      <div className="w-full h-[500px] md:h-[600px] flex items-center justify-center bg-amber-50 rounded-2xl border-2 border-amber-200">
        <div className="text-center">
          <div className="text-5xl mb-3">📍</div>
          <p className="text-amber-700 font-medium">אין ארונות זמינים במפה כרגע</p>
        </div>
      </div>
    )
  }

  // Default center (Israel)
  const defaultCenter: [number, number] = [31.5, 34.75]

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-white rounded-t-2xl border border-gray-200 border-b-0 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Title and Stats */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-blue-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">
              🧰
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">מפת ארונות ציוד</h2>
              <p className="text-sm text-gray-500">ידידים - סיוע בדרכים</p>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="חפש עיר או יישוב..."
                className="w-full h-11 pr-10 pl-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-3">
            <div className="bg-gradient-to-br from-sky-50 to-blue-50 px-4 py-2 rounded-xl text-center">
              <div className="text-2xl font-bold text-sky-600">{cabinets.length}</div>
              <div className="text-xs text-gray-500">ארונות פעילים</div>
            </div>
          </div>
        </div>
      </div>

      {/* Location Notice */}
      <div className="bg-amber-50 border-x border-amber-200 px-4 py-3 flex items-center gap-3">
        <span className="text-xl">📍</span>
        <span className="text-sm text-amber-700">
          המיקומים המוצגים הם משוערים (רדיוס ~500 מטר) לשמירה על פרטיות. לקבלת המיקום המדויק, צרו קשר עם מנהל הארון.
        </span>
      </div>

      {/* Map and Sidebar */}
      <div className="flex flex-col lg:flex-row border border-gray-200 rounded-b-2xl overflow-hidden bg-white">
        {/* Sidebar - Cabinet List */}
        <div className="lg:w-80 max-h-[300px] lg:max-h-[500px] overflow-y-auto border-b lg:border-b-0 lg:border-l border-gray-200 order-2 lg:order-1">
          <div className="p-3 bg-gray-50 border-b border-gray-200 sticky top-0">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <span>🗺️</span>
              רשימת ארונות ({filteredCabinets.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {filteredCabinets.map((cabinet) => (
              <div
                key={cabinet.id}
                onClick={() => handleCircleClick(cabinet.id)}
                className="p-3 hover:bg-sky-50 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-lg flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                    🧰
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 truncate">{cabinet.name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      {cabinet.manager_name && (
                        <span className="flex items-center gap-1">
                          👤 {cabinet.manager_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    ←
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 order-1 lg:order-2">
          {/* Location Status Bar */}
          <div className="bg-white border-b border-gray-200 p-3 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {userLocation ? (
                <span className="text-sky-600 font-medium">📍 המיקום שלך מוצג במפה</span>
              ) : (
                <span className="text-gray-400">📍 לחץ להצגת מיקומך</span>
              )}
            </div>
            <button
              onClick={requestUserLocation}
              className="bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg"
            >
              {userLocation ? '🔄 רענן מיקום' : '📍 הצג מיקום'}
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
            className="z-0 h-[350px] lg:h-[500px]"
            scrollWheelZoom={true}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />

            <MapCenterController userLocation={userLocation} cabinets={filteredCabinets} />

            {/* User location marker */}
            {userLocation && (
              <>
                <Circle
                  center={userLocation}
                  radius={80}
                  pathOptions={{
                    color: '#0ea5e9',
                    fillColor: '#e0f2fe',
                    fillOpacity: 0.3,
                    weight: 0
                  }}
                />
                <Circle
                  center={userLocation}
                  radius={20}
                  pathOptions={{
                    color: '#0284c7',
                    fillColor: '#0ea5e9',
                    fillOpacity: 1,
                    weight: 3
                  }}
                >
                  <Popup>
                    <div className="text-center py-1">
                      <div className="text-sm font-medium text-sky-600">📍 אתה נמצא כאן</div>
                    </div>
                  </Popup>
                </Circle>
              </>
            )}

            {/* Cabinet circles */}
            {filteredCabinets.map((cabinet) => (
              <Circle
                key={cabinet.id}
                center={[cabinet.public_lat, cabinet.public_lng]}
                radius={500}
                pathOptions={{
                  color: '#0ea5e9',
                  fillColor: '#0ea5e9',
                  fillOpacity: 0.15,
                  weight: 2,
                  dashArray: '5, 5'
                }}
              >
                <Popup>
                  <div className="min-w-[250px]">
                    {/* Popup Header */}
                    <div className="bg-gradient-to-r from-sky-400 to-blue-500 text-white p-3 -mx-[1px] -mt-[1px] rounded-t-lg">
                      <div className="font-bold text-lg">{cabinet.name}</div>
                      <span className="inline-block bg-white/20 px-2 py-0.5 rounded-full text-xs mt-1">
                        🟢 פעיל
                      </span>
                      <div className="flex items-center gap-2 bg-white/15 px-2 py-1 rounded mt-2 text-xs">
                        <span>📍</span>
                        <span>מיקום משוער (רדיוס ~500 מ')</span>
                      </div>
                    </div>

                    {/* Popup Body */}
                    <div className="p-3">
                      {cabinet.manager_name && (
                        <div className="flex items-center gap-2 py-2 border-b border-gray-100">
                          <div className="w-8 h-8 bg-sky-50 rounded-lg flex items-center justify-center">👤</div>
                          <div>
                            <div className="text-[10px] text-gray-400 uppercase">מנהל הארון</div>
                            <div className="font-medium text-gray-800">{cabinet.manager_name}</div>
                          </div>
                        </div>
                      )}
                      {cabinet.manager_phone && (
                        <div className="flex items-center gap-2 py-2">
                          <div className="w-8 h-8 bg-sky-50 rounded-lg flex items-center justify-center">📱</div>
                          <div>
                            <div className="text-[10px] text-gray-400 uppercase">טלפון</div>
                            <div className="font-medium text-gray-800">{cabinet.manager_phone}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Popup Actions */}
                    <div className="p-3 bg-gray-50 flex gap-2">
                      <button
                        onClick={() => handleCircleClick(cabinet.id)}
                        className="flex-1 bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 text-white font-medium py-2 px-3 rounded-lg transition-all text-sm flex items-center justify-center gap-1"
                      >
                        🧰 בקשת ציוד
                      </button>
                      {cabinet.manager_phone && (
                        <a
                          href={`tel:${cabinet.manager_phone}`}
                          className="flex-1 bg-white border-2 border-sky-400 text-sky-600 font-medium py-2 px-3 rounded-lg transition-all text-sm flex items-center justify-center gap-1 hover:bg-sky-50"
                        >
                          📞 התקשר
                        </a>
                      )}
                    </div>
                  </div>
                </Popup>
              </Circle>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  )
}
