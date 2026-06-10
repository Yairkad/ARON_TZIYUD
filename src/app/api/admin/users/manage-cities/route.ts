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
  action: 'add' | 'remove' | 'update_visibility'
  city_id: string
  manager_role?: 'manager1' | 'manager2'
  // update_visibility fields
  is_contact_visible?: boolean
  override_name?: string | null
  override_phone?: string | null
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
      // Insert into junction table (no slot limit)
      const { error: addError } = await supabase
        .from('city_manager_assignments')
        .upsert(
          {
            city_id: body.city_id,
            user_id: body.user_id,
            display_role: body.manager_role || 'manager1',
          },
          { onConflict: 'city_id,user_id' }
        )

      if (addError) {
        console.error('Error adding user to city:', addError)
        return NextResponse.json(
          { success: false, error: 'שגיאה בהוספת משתמש לעיר' },
          { status: 500 }
        )
      }

      // Keep display columns in sync for manager1/manager2 slots
      if (body.manager_role === 'manager1' || body.manager_role === 'manager2') {
        const displayUpdate: any =
          body.manager_role === 'manager1'
            ? { manager1_user_id: body.user_id, manager1_name: user.full_name, manager1_phone: user.phone || null }
            : { manager2_user_id: body.user_id, manager2_name: user.full_name, manager2_phone: user.phone || null }

        await supabase.from('cities').update(displayUpdate).eq('id', body.city_id)
      }

      return NextResponse.json({
        success: true,
        message: 'המשתמש נוסף לעיר בהצלחה',
      })

    } else if (body.action === 'remove') {
      // Remove from junction table
      const { error: removeError, count } = await supabase
        .from('city_manager_assignments')
        .delete({ count: 'exact' })
        .eq('city_id', body.city_id)
        .eq('user_id', body.user_id)

      if (removeError) {
        console.error('Error removing user from city:', removeError)
        return NextResponse.json(
          { success: false, error: 'שגיאה בהסרת משתמש מהעיר' },
          { status: 500 }
        )
      }

      if (count === 0) {
        return NextResponse.json(
          { success: false, error: 'המשתמש לא מנהל עיר זו' },
          { status: 400 }
        )
      }

      // Clear display columns if this user was in a named slot
      const { data: city } = await supabase
        .from('cities')
        .select('manager1_user_id, manager2_user_id')
        .eq('id', body.city_id)
        .single()

      if (city) {
        const displayClear: any = {}
        if (city.manager1_user_id === body.user_id) {
          displayClear.manager1_user_id = null
          displayClear.manager1_name = null
          displayClear.manager1_phone = null
        }
        if (city.manager2_user_id === body.user_id) {
          displayClear.manager2_user_id = null
          displayClear.manager2_name = null
          displayClear.manager2_phone = null
        }
        if (Object.keys(displayClear).length > 0) {
          await supabase.from('cities').update(displayClear).eq('id', body.city_id)
        }
      }

      return NextResponse.json({
        success: true,
        message: 'המשתמש הוסר מהעיר בהצלחה',
      })
    }

    if (body.action === 'update_visibility') {
      const updateData: any = {}
      if (body.is_contact_visible !== undefined) updateData.is_contact_visible = body.is_contact_visible
      if (body.override_name !== undefined) updateData.override_name = body.override_name || null
      if (body.override_phone !== undefined) updateData.override_phone = body.override_phone || null

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ success: false, error: 'אין שדות לעדכון' }, { status: 400 })
      }

      const { error: visError } = await supabase
        .from('city_manager_assignments')
        .update(updateData)
        .eq('city_id', body.city_id)
        .eq('user_id', body.user_id)

      if (visError) {
        console.error('Error updating visibility:', visError)
        return NextResponse.json({ success: false, error: 'שגיאה בעדכון הגדרות תצוגה' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'הגדרות תצוגה עודכנו בהצלחה' })
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
