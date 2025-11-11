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

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get user from token
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get user data from public.users table (more reliable than metadata)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, city_id, full_name, is_active')
      .eq('id', user.id)
      .single()

    // Determine user data source - prefer database, fallback to metadata
    let userRole: string | null = null
    let cityId: string | null = null
    let fullName = user.email || ''

    if (userError || !userData) {
      console.error('❌ User not found in users table:', userError)
      // Fallback to metadata if user not in public.users
      const userMetadata = user.user_metadata || {}
      userRole = userMetadata.role || null
      cityId = userMetadata.city_id || null
      fullName = userMetadata.full_name || user.email || ''
    } else {
      // Use data from users table
      userRole = userData.role
      cityId = userData.city_id || null
      fullName = userData.full_name || user.email || ''
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: fullName,
        role: userRole,
        city_id: cityId,
      },
    })
  } catch (error) {
    console.error('Error fetching user info:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}
