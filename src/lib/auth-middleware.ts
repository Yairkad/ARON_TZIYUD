/**
 * Auth Middleware
 * Provides authentication and authorization helpers for API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from './supabase-server'

export type UserRole = 'city_manager' | 'super_admin'
export type UserPermission = 'view_only' | 'approve_requests' | 'full_access'

export interface AuthenticatedUser {
  id: string
  email: string
  role: UserRole
  city_id?: string
  full_name?: string
  permissions: UserPermission
  is_active: boolean
}

/**
 * Middleware to require authentication
 * Returns 401 if user is not authenticated
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ user: AuthenticatedUser | null; error: NextResponse | null }> {
  const profile = await getCurrentUserProfile()

  if (!profile) {
    return {
      user: null,
      error: NextResponse.json(
        { success: false, error: 'לא מורשה - נדרשת התחברות' },
        { status: 401 }
      ),
    }
  }

  // Check if user is active
  if (!profile.is_active) {
    return {
      user: null,
      error: NextResponse.json(
        { success: false, error: 'חשבון זה הושבת - צור קשר עם המנהל' },
        { status: 403 }
      ),
    }
  }

  return {
    user: {
      id: profile.id,
      email: profile.email,
      role: profile.role as UserRole,
      city_id: profile.city_id,
      full_name: profile.full_name,
      permissions: profile.permissions as UserPermission,
      is_active: profile.is_active,
    },
    error: null,
  }
}

/**
 * Middleware to require super admin role
 * Returns 401 if not authenticated, 403 if not super admin
 */
export async function requireSuperAdmin(
  request: NextRequest
): Promise<{ user: AuthenticatedUser | null; error: NextResponse | null }> {
  const { user, error } = await requireAuth(request)

  if (error) {
    return { user: null, error }
  }

  if (user?.role !== 'super_admin') {
    return {
      user: null,
      error: NextResponse.json(
        { success: false, error: 'אין הרשאה - נדרשת הרשאת מנהל ראשי' },
        { status: 403 }
      ),
    }
  }

  return { user, error: null }
}

/**
 * Middleware to require city manager role for a specific city
 * Returns 401 if not authenticated, 403 if not city manager or wrong city
 */
export async function requireCityManager(
  request: NextRequest,
  cityId: string
): Promise<{ user: AuthenticatedUser | null; error: NextResponse | null }> {
  const { user, error } = await requireAuth(request)

  if (error) {
    return { user: null, error }
  }

  // Super admins can access any city
  if (user?.role === 'super_admin') {
    return { user, error: null }
  }

  // City managers can only access their own city
  if (user?.role === 'city_manager' && user?.city_id === cityId) {
    return { user, error: null }
  }

  return {
    user: null,
    error: NextResponse.json(
      { success: false, error: 'אין הרשאה - לא ניתן לגשת לעיר זו' },
      { status: 403 }
    ),
  }
}

/**
 * Middleware to require either super admin OR city manager for a specific city
 * Returns 401 if not authenticated, 403 if neither role matches
 */
export async function requireCityAccess(
  request: NextRequest,
  cityId: string
): Promise<{ user: AuthenticatedUser | null; error: NextResponse | null }> {
  return requireCityManager(request, cityId)
}

/**
 * Helper to get user without requiring auth (returns null if not authenticated)
 * Useful for optional auth endpoints
 */
export async function getOptionalAuth(): Promise<AuthenticatedUser | null> {
  const profile = await getCurrentUserProfile()

  if (!profile) {
    return null
  }

  return {
    id: profile.id,
    email: profile.email,
    role: profile.role as UserRole,
    city_id: profile.city_id,
    full_name: profile.full_name,
    permissions: profile.permissions as UserPermission,
    is_active: profile.is_active,
  }
}

/**
 * Middleware to require full access permission
 * Returns 403 if user doesn't have full_access
 */
export async function requireFullAccess(
  request: NextRequest,
  cityId?: string
): Promise<{ user: AuthenticatedUser | null; error: NextResponse | null }> {
  const { user, error } = await requireAuth(request)

  if (error) {
    return { user: null, error }
  }

  // Super admin always has full access
  if (user?.role === 'super_admin') {
    return { user, error: null }
  }

  // Check city access if cityId provided
  if (cityId && user?.city_id !== cityId) {
    return {
      user: null,
      error: NextResponse.json(
        { success: false, error: 'אין הרשאה - לא ניתן לגשת לעיר זו' },
        { status: 403 }
      ),
    }
  }

  // Check full access permission
  if (user?.permissions !== 'full_access') {
    return {
      user: null,
      error: NextResponse.json(
        { success: false, error: 'אין הרשאה - נדרשת הרשאת עריכה מלאה' },
        { status: 403 }
      ),
    }
  }

  return { user, error: null }
}

/**
 * Middleware to require approve permission (approve_requests or full_access)
 * Returns 403 if user can't approve requests
 */
export async function requireApprovePermission(
  request: NextRequest,
  cityId?: string
): Promise<{ user: AuthenticatedUser | null; error: NextResponse | null }> {
  const { user, error } = await requireAuth(request)

  if (error) {
    return { user: null, error }
  }

  // Super admin always can approve
  if (user?.role === 'super_admin') {
    return { user, error: null }
  }

  // Check city access if cityId provided
  if (cityId && user?.city_id !== cityId) {
    return {
      user: null,
      error: NextResponse.json(
        { success: false, error: 'אין הרשאה - לא ניתן לגשת לעיר זו' },
        { status: 403 }
      ),
    }
  }

  // Check approve permission
  if (user?.permissions === 'view_only') {
    return {
      user: null,
      error: NextResponse.json(
        { success: false, error: 'אין הרשאה - נדרשת הרשאת אישור בקשות' },
        { status: 403 }
      ),
    }
  }

  return { user, error: null }
}

/**
 * Check if user has specific permission
 */
export function hasPermission(
  user: AuthenticatedUser | null,
  requiredPermission: UserPermission
): boolean {
  if (!user) return false
  if (user.role === 'super_admin') return true

  const permissionLevels: Record<UserPermission, number> = {
    view_only: 1,
    approve_requests: 2,
    full_access: 3,
  }

  const userLevel = permissionLevels[user.permissions]
  const requiredLevel = permissionLevels[requiredPermission]

  return userLevel >= requiredLevel
}
