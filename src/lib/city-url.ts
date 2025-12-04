/**
 * Helper functions for generating city URLs
 * Uses slug (Hebrew name) when available, falls back to UUID
 */

import { City } from '@/types'

/**
 * Generate URL path for a city
 * @param city - City object with id and optional slug
 * @param subPath - Optional sub-path (e.g., 'admin')
 * @returns URL path like /city/בית-שמש or /city/בית-שמש/admin
 */
export function getCityUrl(city: { id: string; slug?: string | null; name?: string }, subPath?: string): string {
  // Use slug if available, otherwise fall back to ID
  const identifier = city.slug || city.id
  const basePath = `/city/${encodeURIComponent(identifier)}`
  return subPath ? `${basePath}/${subPath}` : basePath
}

/**
 * Generate URL path for city admin page
 * @param city - City object with id and optional slug
 * @returns URL path like /city/בית-שמש/admin
 */
export function getCityAdminUrl(city: { id: string; slug?: string | null; name?: string }): string {
  return getCityUrl(city, 'admin')
}

/**
 * Generate slug from city name
 * Replaces spaces with hyphens
 * @param name - City name in Hebrew
 * @returns Slug like בית-שמש
 */
export function generateSlug(name: string): string {
  return name.trim().replace(/\s+/g, '-')
}
