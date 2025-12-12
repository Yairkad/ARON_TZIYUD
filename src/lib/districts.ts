/**
 * District definitions for wheel stations
 * Each district has a color, Hebrew name, and English identifier
 */

export type DistrictCode = 'jerusalem' | 'north' | 'center' | 'south' | 'haifa' | 'tel_aviv'

export interface District {
  code: DistrictCode
  name: string      // Hebrew name
  color: string     // Hex color for the district dot
}

export const DISTRICTS: Record<DistrictCode, District> = {
  jerusalem: {
    code: 'jerusalem',
    name: 'ירושלים',
    color: '#ef4444', // Red
  },
  north: {
    code: 'north',
    name: 'צפון',
    color: '#22c55e', // Green
  },
  center: {
    code: 'center',
    name: 'מרכז',
    color: '#3b82f6', // Blue
  },
  south: {
    code: 'south',
    name: 'דרום',
    color: '#f59e0b', // Orange
  },
  haifa: {
    code: 'haifa',
    name: 'חיפה',
    color: '#8b5cf6', // Purple
  },
  tel_aviv: {
    code: 'tel_aviv',
    name: 'תל אביב',
    color: '#ec4899', // Pink
  },
}

export function getDistrictColor(districtCode?: string | null): string {
  if (!districtCode) return '#6b7280' // Gray for no district
  return DISTRICTS[districtCode as DistrictCode]?.color || '#6b7280'
}

export function getDistrictName(districtCode?: string | null): string {
  if (!districtCode) return 'ללא מחוז'
  return DISTRICTS[districtCode as DistrictCode]?.name || districtCode
}
