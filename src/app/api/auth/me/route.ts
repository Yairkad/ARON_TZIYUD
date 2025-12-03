/**
 * API Route: Get Current User Info
 * GET /api/auth/me
 *
 * Returns information about the currently authenticated user
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

// Disable caching for this endpoint
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    // Get access token from cookies
    const accessToken = request.cookies.get('sb-access-token')?.value
    const refreshToken = request.cookies.get('sb-refresh-token')?.value

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get user from token
    let { data: { user }, error } = await supabase.auth.getUser(accessToken)

    // If token expired, try to refresh it
    let newAccessToken: string | null = null
    let newRefreshToken: string | null = null

    if ((error || !user) && refreshToken) {
      console.log('🔄 Access token expired, attempting to refresh...')
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
        refresh_token: refreshToken
      })

      if (refreshError || !refreshData.session) {
        console.error('❌ Failed to refresh token:', refreshError)
        return NextResponse.json(
          { success: false, error: 'Session expired' },
          { status: 401 }
        )
      }

      // Use the new session
      user = refreshData.user
      newAccessToken = refreshData.session.access_token
      newRefreshToken = refreshData.session.refresh_token
      console.log('✅ Token refreshed successfully')
    } else if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    // At this point user is guaranteed to be non-null
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      )
    }

    // Get user data from public.users table (more reliable than metadata)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, city_id, full_name, phone, is_active, permissions')
      .eq('id', user.id)
      .single()

    // Determine user data source - prefer database, fallback to metadata
    let userRole: string | null = null
    let cityId: string | null = null
    let fullName = user.email || ''
    let phone: string | null = null
    let permissions: string = 'full_access'
    let manager: any = null

    if (userError || !userData) {
      console.error('❌ User not found in users table:', userError)
      // Fallback to metadata if user not in public.users
      const userMetadata = user.user_metadata || {}
      userRole = userMetadata.role || null
      cityId = userMetadata.city_id || null
      fullName = userMetadata.full_name || user.email || ''
      phone = userMetadata.phone || null
      permissions = userMetadata.permissions || 'full_access'
    } else {
      // Use data from users table
      userRole = userData.role
      cityId = userData.city_id || null
      fullName = userData.full_name || user.email || ''
      phone = userData.phone || null
      permissions = userData.permissions || 'full_access'
    }

    // For city managers, also get data from city_managers table and all managed cities
    let managedCities: any[] = []
    if (userRole === 'city_manager') {
      // Try to find by auth ID first, then by email
      const { data: managerByAuth } = await supabase
        .from('city_managers')
        .select('*')
        .eq('id', user.id)
        .single()

      if (managerByAuth) {
        manager = managerByAuth
      } else {
        const { data: managerByEmail } = await supabase
          .from('city_managers')
          .select('*')
          .eq('email', user.email)
          .single()

        manager = managerByEmail
      }

      // Get all cities managed by this user
      const { data: cities } = await supabase
        .from('cities')
        .select('id, name, is_active, manager1_user_id, manager2_user_id')
        .or(`manager1_user_id.eq.${user.id},manager2_user_id.eq.${user.id}`)
        .eq('is_active', true)
        .order('name')

      if (cities) {
        managedCities = cities.map(city => ({
          id: city.id,
          name: city.name,
          role: city.manager1_user_id === user.id ? 'manager1' : 'manager2'
        }))
      }
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: fullName,
        phone: phone,
        role: userRole,
        city_id: cityId,
        permissions: permissions,
      },
      manager: manager,  // Include city_managers data if available
      managed_cities: managedCities  // Include all managed cities for city managers
    })

    // Add no-cache headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    // If we refreshed the token, update the cookies
    if (newAccessToken && newRefreshToken) {
      const cookieMaxAge = 60 * 60 * 24 * 30 // 30 days
      const expiryDate = new Date(Date.now() + cookieMaxAge * 1000)

      response.cookies.set('sb-access-token', newAccessToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: cookieMaxAge,
        expires: expiryDate,
        path: '/',
      })

      response.cookies.set('sb-refresh-token', newRefreshToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: cookieMaxAge,
        expires: expiryDate,
        path: '/',
      })
    }

    return response
  } catch (error) {
    console.error('Error fetching user info:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}
