import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

/**
 * GET /api/managers/list
 * Get list of all city managers (super admin only)
 * Optional query params: ?city_id=xxx to filter by city
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    // Verify super admin authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'נדרש אימות' },
        { status: 401 }
      )
    }

    // Get current user from session
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !authUser) {
      return NextResponse.json(
        { success: false, error: 'משתמש לא מאומת' },
        { status: 401 }
      )
    }

    // Verify super admin role
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', authUser.id)
      .single()

    if (userError || currentUser?.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'אין הרשאות למבצע פעולה זו' },
        { status: 403 }
      )
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams
    const cityId = searchParams.get('city_id')

    // Build query
    let query = supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        phone,
        manager_role,
        is_active,
        last_login_at,
        created_at,
        city_id,
        cities (
          id,
          name
        )
      `)
      .eq('role', 'city_manager')
      .order('created_at', { ascending: false })

    // Filter by city if provided
    if (cityId) {
      query = query.eq('city_id', cityId)
    }

    const { data: managers, error: fetchError } = await query

    if (fetchError) {
      console.error('Error fetching managers:', fetchError)
      return NextResponse.json(
        { success: false, error: 'שגיאה בטעינת רשימת מנהלים' },
        { status: 500 }
      )
    }

    // Get email verification status from auth.users
    const managersWithVerification = await Promise.all(
      (managers || []).map(async (manager: any) => {
        const { data: authUserData } = await supabase.auth.admin.getUserById(manager.id)

        return {
          ...manager,
          email_verified: authUserData?.user?.email_confirmed_at ? true : false,
          city_name: manager.cities?.name || 'לא משויך'
        }
      })
    )

    return NextResponse.json({
      success: true,
      managers: managersWithVerification
    })

  } catch (error) {
    console.error('List managers error:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאה בטעינת רשימת מנהלים' },
      { status: 500 }
    )
  }
}
