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

    // Get query parameters for filtering and sorting
    const searchParams = request.nextUrl.searchParams
    const cityFilter = searchParams.get('city_id')
    const searchQuery = searchParams.get('search')
    const sortBy = searchParams.get('sort') || 'name' // Default: alphabetical by name
    const sortOrder = searchParams.get('order') || 'asc'

    // Build query - get only city_manager users (super_admins are managed in master-admin)
    let query = supabase
      .from('users')
      .select('*')
      .eq('role', 'city_manager')

    // Apply filters
    if (cityFilter) {
      query = query.eq('city_id', cityFilter)
    }

    if (searchQuery) {
      query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
    }

    // Apply sorting
    if (sortBy === 'name') {
      query = query.order('full_name', { ascending: sortOrder === 'asc' })
    } else if (sortBy === 'email') {
      query = query.order('email', { ascending: sortOrder === 'asc' })
    } else if (sortBy === 'created_at') {
      query = query.order('created_at', { ascending: sortOrder === 'asc' })
    } else {
      // Default: alphabetical by name
      query = query.order('full_name', { ascending: true })
    }

    const { data: users, error: usersError } = await query

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json(
        { success: false, error: 'שגיאה בטעינת רשימת משתמשים' },
        { status: 500 }
      )
    }

    // Get all assignments to find which cities each user manages
    const { data: assignments, error: assignError } = await supabase
      .from('city_manager_assignments')
      .select('id, user_id, city_id, display_role, is_contact_visible, override_name, override_phone, cities(id, name, is_active)')

    if (assignError) {
      console.error('Error fetching city assignments:', assignError)
    }

    // Build a map: user_id -> [{ id, name, is_active, role, ... }]
    const assignmentsByUser: Record<string, any[]> = {}
    for (const a of assignments || []) {
      if (!assignmentsByUser[a.user_id]) assignmentsByUser[a.user_id] = []
      if (a.cities) {
        assignmentsByUser[a.user_id].push({
          assignment_id: a.id,
          id: (a.cities as any).id,
          name: (a.cities as any).name,
          is_active: (a.cities as any).is_active,
          role: a.display_role || 'manager1',
          is_contact_visible: a.is_contact_visible,
          override_name: a.override_name,
          override_phone: a.override_phone,
        })
      }
    }

    // Transform data for frontend
    const transformedUsers = users.map(user => {
      const managedCities = assignmentsByUser[user.id] || []
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
        managed_cities: managedCities.map((c: any) => ({
          id: c.id,
          name: c.name,
          role: c.role,
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
