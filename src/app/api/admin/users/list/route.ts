/**
 * API Route: List All Users
 * GET /api/admin/users/list
 *
 * Returns all users with their roles and permissions
 * Only accessible by super_admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  // Authenticate user using the same method as /api/auth/me
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
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: 'לא מורשה - נדרשת התחברות' },
      { status: 401 }
    )
  }

  // Get user profile from users table to check role
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (profileError || !userProfile) {
    return NextResponse.json(
      { success: false, error: 'משתמש לא נמצא במערכת' },
      { status: 404 }
    )
  }

  // Check if user is super admin
  if (userProfile.role !== 'super_admin') {
    return NextResponse.json(
      { success: false, error: 'אין הרשאה - נדרשת הרשאת מנהל ראשי' },
      { status: 403 }
    )
  }

  // Check if user is active
  if (!userProfile.is_active) {
    return NextResponse.json(
      { success: false, error: 'המשתמש לא פעיל' },
      { status: 403 }
    )
  }

  try {
    const supabase = createServiceClient()

    // Get all users (city managers only)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'city_manager')
      .order('created_at', { ascending: false })

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json(
        { success: false, error: 'שגיאה בטעינת רשימת משתמשים' },
        { status: 500 }
      )
    }

    // Get all cities to find which cities each user manages
    const { data: cities, error: citiesError } = await supabase
      .from('cities')
      .select('id, name, is_active, manager1_user_id, manager2_user_id')

    if (citiesError) {
      console.error('Error fetching cities:', citiesError)
    }

    // Transform data for frontend
    const transformedUsers = users.map(user => {
      // Find all cities managed by this user
      const managedCities = cities?.filter(city =>
        city.manager1_user_id === user.id || city.manager2_user_id === user.id
      ) || []

      // Use the first managed city as the primary city for backwards compatibility
      const primaryCity = managedCities[0] || null

      return {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        permissions: user.permissions,
        phone: user.phone,
        is_active: user.is_active,
        city: primaryCity ? {
          id: primaryCity.id,
          name: primaryCity.name,
          is_active: primaryCity.is_active,
        } : null,
        managed_cities: managedCities.map(c => ({
          id: c.id,
          name: c.name,
          role: c.manager1_user_id === user.id ? 'manager1' : 'manager2'
        })),
        last_login_at: user.last_login_at,
        created_at: user.created_at,
        updated_at: user.updated_at,
      }
    })

    return NextResponse.json({
      success: true,
      users: transformedUsers,
    })

  } catch (error) {
    console.error('Error in list users API:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאת שרת פנימית' },
      { status: 500 }
    )
  }
}
