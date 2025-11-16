/**
 * API Route: Manage User Cities
 * POST /api/admin/users/manage-cities
 *
 * Add or remove cities from a user's managed cities
 * Only accessible by super_admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

interface ManageCitiesBody {
  user_id: string
  action: 'add' | 'remove'
  city_id: string
  manager_role?: 'manager1' | 'manager2'
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const accessToken = request.cookies.get('sb-access-token')?.value

  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: 'לא מורשה - נדרשת התחברות' },
      { status: 401 }
    )
  }

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(accessToken)

  if (authError || !authUser) {
    return NextResponse.json(
      { success: false, error: 'לא מורשה - נדרשת התחברות' },
      { status: 401 }
    )
  }

  // Check if user is super admin
  const { data: adminProfile } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', authUser.id)
    .single()

  if (!adminProfile || adminProfile.role !== 'super_admin' || !adminProfile.is_active) {
    return NextResponse.json(
      { success: false, error: 'אין הרשאה - נדרשת הרשאת מנהל ראשי' },
      { status: 403 }
    )
  }

  try {
    const body: ManageCitiesBody = await request.json()

    if (!body.user_id || !body.city_id || !body.action) {
      return NextResponse.json(
        { success: false, error: 'חסרים פרמטרים נדרשים' },
        { status: 400 }
      )
    }

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('full_name, phone')
      .eq('id', body.user_id)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'משתמש לא נמצא' },
        { status: 404 }
      )
    }

    if (body.action === 'add') {
      // Validate manager_role is provided for add action
      if (!body.manager_role) {
        return NextResponse.json(
          { success: false, error: 'נדרש תפקיד מנהל' },
          { status: 400 }
        )
      }

      // Add user to city
      const cityUpdateData: any = {}

      if (body.manager_role === 'manager1') {
        cityUpdateData.manager1_user_id = body.user_id
        cityUpdateData.manager1_name = user.full_name
        cityUpdateData.manager1_phone = user.phone || null
      } else if (body.manager_role === 'manager2') {
        cityUpdateData.manager2_user_id = body.user_id
        cityUpdateData.manager2_name = user.full_name
        cityUpdateData.manager2_phone = user.phone || null
      }

      const { error: addError } = await supabase
        .from('cities')
        .update(cityUpdateData)
        .eq('id', body.city_id)

      if (addError) {
        console.error('Error adding user to city:', addError)
        return NextResponse.json(
          { success: false, error: 'שגיאה בהוספת משתמש לעיר' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'המשתמש נוסף לעיר בהצלחה',
      })

    } else if (body.action === 'remove') {
      // Check which role the user has in this city
      const { data: city, error: cityError } = await supabase
        .from('cities')
        .select('manager1_user_id, manager2_user_id')
        .eq('id', body.city_id)
        .single()

      if (cityError || !city) {
        return NextResponse.json(
          { success: false, error: 'עיר לא נמצאה' },
          { status: 404 }
        )
      }

      // Remove user from city
      const cityUpdateData: any = {}

      if (city.manager1_user_id === body.user_id) {
        cityUpdateData.manager1_user_id = null
        cityUpdateData.manager1_name = null
        cityUpdateData.manager1_phone = null
      }

      if (city.manager2_user_id === body.user_id) {
        cityUpdateData.manager2_user_id = null
        cityUpdateData.manager2_name = null
        cityUpdateData.manager2_phone = null
      }

      if (Object.keys(cityUpdateData).length === 0) {
        return NextResponse.json(
          { success: false, error: 'המשתמש לא מנהל עיר זו' },
          { status: 400 }
        )
      }

      const { error: removeError } = await supabase
        .from('cities')
        .update(cityUpdateData)
        .eq('id', body.city_id)

      if (removeError) {
        console.error('Error removing user from city:', removeError)
        return NextResponse.json(
          { success: false, error: 'שגיאה בהסרת משתמש מהעיר' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'המשתמש הוסר מהעיר בהצלחה',
      })
    }

    return NextResponse.json(
      { success: false, error: 'פעולה לא חוקית' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error in manage cities API:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאת שרת פנימית' },
      { status: 500 }
    )
  }
}
