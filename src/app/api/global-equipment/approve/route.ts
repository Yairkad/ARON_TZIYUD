import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Helper to create authenticated Supabase client
async function createAuthClient() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()

  const accessTokenCookie = allCookies.find(cookie => cookie.name === 'sb-access-token')
  const accessToken = accessTokenCookie?.value

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    accessToken ? {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    } : {}
  )
}

// Create service client for database operations
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// POST - Approve, reject, or merge pending equipment
export async function POST(request: Request) {
  try {
    const supabase = await createAuthClient()
    const serviceClient = createServiceClient()
    const body = await request.json()
    // action: 'approve' | 'reject' | 'merge'
    // mergeTargetId: ID of existing equipment to merge into (only for 'merge' action)
    // rejectReason: optional reason for rejection
    const { equipmentId, action, mergeTargetId, rejectReason } = body

    if (!equipmentId || !action) {
      return NextResponse.json({ error: 'חסרים פרמטרים' }, { status: 400 })
    }

    if (!['approve', 'reject', 'merge'].includes(action)) {
      return NextResponse.json({ error: 'פעולה לא חוקית' }, { status: 400 })
    }

    if (action === 'merge' && !mergeTargetId) {
      return NextResponse.json({ error: 'חובה לבחור פריט למיזוג' }, { status: 400 })
    }

    // Check authentication and role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'super_admin') {
      return NextResponse.json({ error: 'רק מנהל ראשי יכול לאשר/לדחות פריטים' }, { status: 403 })
    }

    // Get equipment details with creator info
    const { data: equipment } = await serviceClient
      .from('global_equipment_pool')
      .select('*, creator:users!created_by(id, full_name, email, city_id, city:cities!city_id(id, name, manager1_user_id, manager2_user_id))')
      .eq('id', equipmentId)
      .single()

    if (!equipment) {
      return NextResponse.json({ error: 'פריט לא נמצא' }, { status: 404 })
    }

    if (equipment.status !== 'pending_approval') {
      return NextResponse.json({ error: 'פריט זה לא ממתין לאישור' }, { status: 400 })
    }

    if (action === 'approve') {
      // Approve - change status to active
      const { error } = await serviceClient
        .from('global_equipment_pool')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', equipmentId)

      if (error) {
        console.error('Error approving equipment:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Notify the city manager who requested it
      if (equipment.creator?.city_id) {
        await serviceClient.from('admin_notifications').insert({
          city_id: equipment.creator.city_id,
          message: `✅ הבקשה להוספת "${equipment.name}" למאגר אושרה! הפריט זמין כעת במאגר הגלובלי.`,
          is_read: false
        })
      }

      return NextResponse.json({ message: `הפריט "${equipment.name}" אושר והתווסף למאגר` })

    } else if (action === 'merge') {
      // Merge - replace request with existing equipment in city

      // Get target equipment details
      const { data: targetEquipment } = await serviceClient
        .from('global_equipment_pool')
        .select('*')
        .eq('id', mergeTargetId)
        .eq('status', 'active')
        .single()

      if (!targetEquipment) {
        return NextResponse.json({ error: 'פריט היעד למיזוג לא נמצא או לא פעיל' }, { status: 404 })
      }

      // Check if the city already has the target equipment
      const cityId = equipment.creator?.city_id
      if (cityId) {
        const { data: existingCityEquipment } = await serviceClient
          .from('city_equipment')
          .select('id')
          .eq('city_id', cityId)
          .eq('global_equipment_id', mergeTargetId)
          .single()

        if (!existingCityEquipment) {
          // Add the target equipment to the city
          await serviceClient.from('city_equipment').insert({
            city_id: cityId,
            global_equipment_id: mergeTargetId,
            quantity: 1,
            display_order: 999
          })
        }

        // Notify the city manager
        await serviceClient.from('admin_notifications').insert({
          city_id: cityId,
          message: `🔄 הבקשה להוספת "${equipment.name}" מוזגה עם הפריט הקיים "${targetEquipment.name}". הפריט "${targetEquipment.name}" נוסף לעיר שלך.`,
          is_read: false
        })
      }

      // Delete the pending request
      await serviceClient
        .from('global_equipment_pool')
        .delete()
        .eq('id', equipmentId)

      return NextResponse.json({
        message: `הבקשה "${equipment.name}" מוזגה עם "${targetEquipment.name}"`,
        mergedWith: targetEquipment.name
      })

    } else {
      // Reject - delete from pool and notify

      // Notify the city manager who requested it
      if (equipment.creator?.city_id) {
        const reasonText = rejectReason ? `\nסיבה: ${rejectReason}` : ''
        await serviceClient.from('admin_notifications').insert({
          city_id: equipment.creator.city_id,
          message: `❌ הבקשה להוספת "${equipment.name}" למאגר נדחתה.${reasonText}`,
          is_read: false
        })
      }

      // Delete the request
      const { error } = await serviceClient
        .from('global_equipment_pool')
        .delete()
        .eq('id', equipmentId)

      if (error) {
        console.error('Error rejecting equipment:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ message: `הבקשה להוספת "${equipment.name}" נדחתה` })
    }
  } catch (error) {
    console.error('Error in approve/reject:', error)
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
}
