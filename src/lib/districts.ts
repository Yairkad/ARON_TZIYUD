/**
 * District definitions for wheel stations
 * Districts are now stored in the database and can be managed dynamically
 */

import { supabase } from './supabase'

export interface District {
  id: string
  code: string
  name: string      // Hebrew name
  color: string     // Hex color for the district dot
  created_at?: string
  updated_at?: string
}

// Cache for districts to avoid repeated DB calls
let districtsCache: District[] | null = null
let lastFetch = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function getDistricts(): Promise<District[]> {
  const now = Date.now()

  // Return cached data if still fresh
  if (districtsCache && (now - lastFetch) < CACHE_DURATION) {
    return districtsCache
  }

  try {
    const { data, error } = await supabase
      .from('districts')
      .select('*')
      .order('name')

    if (error) throw error

    districtsCache = data || []
    lastFetch = now
    return districtsCache
  } catch (error) {
    console.error('Error fetching districts:', error)
    return []
  }
}

export function getDistrictColor(districtCode?: string | null, districts?: District[]): string {
  if (!districtCode) return '#6b7280' // Gray for no district

  if (districts) {
    const district = districts.find(d => d.code === districtCode)
    return district?.color || '#6b7280'
  }

  // Fallback to cache if available
  if (districtsCache) {
    const district = districtsCache.find(d => d.code === districtCode)
    return district?.color || '#6b7280'
  }

  return '#6b7280'
}

export function getDistrictName(districtCode?: string | null, districts?: District[]): string {
  if (!districtCode) return 'ללא מחוז'

  if (districts) {
    const district = districts.find(d => d.code === districtCode)
    return district?.name || districtCode
  }

  // Fallback to cache if available
  if (districtsCache) {
    const district = districtsCache.find(d => d.code === districtCode)
    return district?.name || districtCode
  }

  return districtCode
}

// Clear cache (useful after adding/editing/deleting districts)
export function clearDistrictsCache() {
  districtsCache = null
  lastFetch = 0
}
