/**
 * Borrow Request Management API
 * PUT /api/wheel-stations/[stationId]/borrows/[borrowId] - Approve or reject pending borrow request
 * DELETE /api/wheel-stations/[stationId]/borrows/[borrowId] - Delete/reject pending request
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RouteParams {
  params: Promise<{ stationId: string; borrowId: string }>
}

// Helper to verify station manager
async function verifyStationManager(stationId: string, phone: string, password: string): Promise<{ success: boolean; error?: string; managerId?: string }> {
  const { data: station, error } = await supabase
    .from('wheel_stations')
    .select(`
      manager_password,
      wheel_station_managers (id, phone)
    `)
    .eq('id', stationId)
    .single()

  if (error || !station) {
    return { success: false, error: 'Station not found' }
  }

  if (station.manager_password !== password) {
    return { success: false, error: 'סיסמא שגויה' }
  }

  const cleanPhone = phone.replace(/\D/g, '')
  const manager = station.wheel_station_managers.find((m: { id: string; phone: string }) =>
    m.phone.replace(/\D/g, '') === cleanPhone
  )

  if (!manager) {
    return { success: false, error: 'מספר הטלפון לא נמצא ברשימת המנהלים' }
  }

  return { success: true, managerId: manager.id }
}

// PUT - Approve pending borrow request
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { stationId, borrowId } = await params
    const body = await request.json()
    const { manager_phone, manager_password, action } = body

    // Verify manager credentials
    if (!manager_phone || !manager_password) {
      return NextResponse.json({ error: 'נדרש טלפון וסיסמא לביצוע פעולה זו' }, { status: 401 })
    }

    const auth = await verifyStationManager(stationId, manager_phone, manager_password)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    // Get the borrow request
    const { data: borrow, error: borrowError } = await supabase
      .from('wheel_borrows')
      .select('id, wheel_id, status')
      .eq('id', borrowId)
      .eq('station_id', stationId)
      .single()

    if (borrowError || !borrow) {
      return NextResponse.json({ error: 'בקשת השאלה לא נמצאה' }, { status: 404 })
    }

    if (borrow.status !== 'pending') {
      return NextResponse.json({ error: 'הבקשה כבר טופלה' }, { status: 400 })
    }

    if (action === 'approve') {
      // Check wheel is still available
      const { data: wheel, error: wheelError } = await supabase
        .from('wheels')
        .select('id, is_available')
        .eq('id', borrow.wheel_id)
        .single()

      if (wheelError || !wheel) {
        return NextResponse.json({ error: 'הגלגל לא נמצא' }, { status: 404 })
      }

      if (!wheel.is_available) {
        return NextResponse.json({ error: 'הגלגל כבר מושאל למישהו אחר' }, { status: 400 })
      }

      // Approve - update status to 'borrowed' and mark wheel as unavailable
      const { error: updateBorrowError } = await supabase
        .from('wheel_borrows')
        .update({
          status: 'borrowed',
          created_by_manager_id: auth.managerId
        })
        .eq('id', borrowId)

      if (updateBorrowError) {
        console.error('Error approving borrow:', updateBorrowError)
        return NextResponse.json({ error: 'שגיאה באישור הבקשה' }, { status: 500 })
      }

      // Update wheel availability
      const { error: updateWheelError } = await supabase
        .from('wheels')
        .update({ is_available: false })
        .eq('id', borrow.wheel_id)

      if (updateWheelError) {
        console.error('Error updating wheel:', updateWheelError)
        // Rollback borrow status
        await supabase.from('wheel_borrows').update({ status: 'pending' }).eq('id', borrowId)
        return NextResponse.json({ error: 'שגיאה בעדכון סטטוס הגלגל' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'הבקשה אושרה והגלגל סומן כמושאל' })

    } else if (action === 'reject') {
      // Reject - update status to 'rejected'
      const { error: updateError } = await supabase
        .from('wheel_borrows')
        .update({ status: 'rejected' })
        .eq('id', borrowId)

      if (updateError) {
        console.error('Error rejecting borrow:', updateError)
        return NextResponse.json({ error: 'שגיאה בדחיית הבקשה' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'הבקשה נדחתה' })
    }

    return NextResponse.json({ error: 'פעולה לא תקינה' }, { status: 400 })

  } catch (error) {
    console.error('Error in PUT borrow:', error)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}

// DELETE - Delete pending request
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { stationId, borrowId } = await params
    const body = await request.json()
    const { manager_phone, manager_password } = body

    // Verify manager credentials
    if (!manager_phone || !manager_password) {
      return NextResponse.json({ error: 'נדרש טלפון וסיסמא לביצוע פעולה זו' }, { status: 401 })
    }

    const auth = await verifyStationManager(stationId, manager_phone, manager_password)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    // Delete the borrow request
    const { error } = await supabase
      .from('wheel_borrows')
      .delete()
      .eq('id', borrowId)
      .eq('station_id', stationId)
      .eq('status', 'pending')

    if (error) {
      console.error('Error deleting borrow:', error)
      return NextResponse.json({ error: 'שגיאה במחיקת הבקשה' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in DELETE borrow:', error)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}
