import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * API endpoint לעדכון סטטוס של רשומת השאלה
 * משמש גם מתנדבים (החזרה) וגם מנהלים (עדכון סטטוס)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { borrowId, status, equipmentStatus, faultyNotes, isManagerAction } = body

    if (!borrowId) {
      return NextResponse.json(
        { error: 'חסר מזהה השאלה' },
        { status: 400 }
      )
    }

    if (!status) {
      return NextResponse.json(
        { error: 'חסר סטטוס' },
        { status: 400 }
      )
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // If this is a manager action, verify the user is authenticated and has permission
    if (isManagerAction) {
      const cookieStore = await cookies()
      const accessTokenCookie = cookieStore.get('sb-access-token')

      if (!accessTokenCookie?.value) {
        return NextResponse.json(
          { error: 'לא מורשה' },
          { status: 401 }
        )
      }

      // Create auth client to verify user
      const authClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${accessTokenCookie.value}`
            }
          }
        }
      )

      const { data: { user } } = await authClient.auth.getUser()
      if (!user) {
        return NextResponse.json(
          { error: 'לא מורשה' },
          { status: 401 }
        )
      }

      // Verify user is city manager or super admin
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!userData || (userData.role !== 'city_manager' && userData.role !== 'super_admin')) {
        return NextResponse.json(
          { error: 'אין הרשאה לבצע פעולה זו' },
          { status: 403 }
        )
      }
    }

    // Get the borrow record
    const { data: borrowRecord, error: fetchError } = await supabase
      .from('borrow_history')
      .select('id, status, city_id, equipment_name, global_equipment_id, equipment_id')
      .eq('id', borrowId)
      .single()

    if (fetchError || !borrowRecord) {
      console.error('Error fetching borrow record:', fetchError)
      return NextResponse.json(
        { error: 'רשומת ההשאלה לא נמצאה' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Record<string, any> = { status }

    // Add return_date if changing to returned or pending_approval
    if (status === 'returned' || status === 'pending_approval') {
      if (!borrowRecord.status.includes('returned') && borrowRecord.status !== 'pending_approval') {
        updateData.return_date = new Date().toISOString()
      }
    }

    // Add equipment status if provided (for return flow)
    if (equipmentStatus) {
      updateData.equipment_status = equipmentStatus
    }

    // Add faulty notes if provided
    if (equipmentStatus === 'faulty' && faultyNotes) {
      updateData.faulty_notes = faultyNotes.trim()
    }

    const { error: updateError } = await supabase
      .from('borrow_history')
      .update(updateData)
      .eq('id', borrowId)

    if (updateError) {
      console.error('Error updating borrow record:', updateError)
      return NextResponse.json(
        { error: 'שגיאה בעדכון רשומת ההשאלה' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'הרשומה עודכנה בהצלחה',
      cityId: borrowRecord.city_id,
      equipmentName: borrowRecord.equipment_name,
      previousStatus: borrowRecord.status,
      newStatus: status,
      globalEquipmentId: borrowRecord.global_equipment_id || borrowRecord.equipment_id
    })

  } catch (error) {
    console.error('Update borrow status error:', error)
    return NextResponse.json(
      { error: 'שגיאת שרת' },
      { status: 500 }
    )
  }
}
