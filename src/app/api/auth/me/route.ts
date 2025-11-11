/**
 * API Route: Get Current User Info
 * GET /api/auth/me
 *
 * Returns information about the currently authenticated user
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

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

    // Get user metadata
    const userMetadata = user.user_metadata || {}
    const userRole = userMetadata.role || null
    const cityId = userMetadata.city_id || null
    const fullName = userMetadata.full_name || user.email

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
