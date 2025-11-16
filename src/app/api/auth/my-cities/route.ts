/**
 * API Route: Get Current User's Cities
 * GET /api/auth/my-cities
 *
 * Returns all cities managed by the currently authenticated user
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    // Get access token from cookies
    const accessToken = request.cookies.get('sb-access-token')?.value

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'לא מורשה - נדרשת התחברות' },
        { status: 401 }
      )
    }

    // Get user from token
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'טוקן לא תקין' },
        { status: 401 }
      )
    }

    // Get user data from public.users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: 'משתמש לא נמצא במערכת' },
        { status: 404 }
      )
    }

    // Check if user is active
    if (!userData.is_active) {
      return NextResponse.json(
        { success: false, error: 'המשתמש לא פעיל' },
        { status: 403 }
      )
    }

    // Check if user is city manager
    if (userData.role !== 'city_manager') {
      return NextResponse.json(
        { success: false, error: 'נתיב זה מיועד למנהלי ערים בלבד' },
        { status: 403 }
      )
    }

    // Get all cities managed by this user
    const { data: cities, error: citiesError } = await supabase
      .from('cities')
      .select('id, name, is_active, manager1_user_id, manager2_user_id')
      .or(`manager1_user_id.eq.${user.id},manager2_user_id.eq.${user.id}`)
      .eq('is_active', true)
      .order('name')

    if (citiesError) {
      console.error('Error fetching cities:', citiesError)
      return NextResponse.json(
        { success: false, error: 'שגיאה בטעינת ערים' },
        { status: 500 }
      )
    }

    // Transform cities data
    const transformedCities = cities.map(city => ({
      id: city.id,
      name: city.name,
      role: city.manager1_user_id === user.id ? 'manager1' : 'manager2'
    }))

    const response = NextResponse.json({
      success: true,
      cities: transformedCities,
    })

    // Add no-cache headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response
  } catch (error) {
    console.error('Error fetching user cities:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאת שרת' },
      { status: 500 }
    )
  }
}
