/**
 * Wheel Borrow API
 * POST /api/wheel-stations/[stationId]/wheels/[wheelId]/borrow - Mark wheel as borrowed
 * PUT /api/wheel-stations/[stationId]/wheels/[wheelId]/borrow - Return wheel
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RouteParams {
  params: Promise<{ stationId: string; wheelId: string }>
}

// Helper to verify station manager (by phone and password)
async function verifyStationManager(stationId: string, phone: string, password: string): Promise<{ success: boolean; error?: string; managerId?: string }> {
  // Get station with password and managers
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

  // Check password
  if (station.manager_password !== password) {
    return { success: false, error: 'סיסמא שגויה' }
  }

  // Check if phone is in managers list
  const cleanPhone = phone.replace(/\D/g, '')
  const manager = station.wheel_station_managers.find((m: { id: string; phone: string }) =>
    m.phone.replace(/\D/g, '') === cleanPhone
  )

  if (!manager) {
    return { success: false, error: 'מספר הטלפון לא נמצא ברשימת המנהלים' }
  }

  return { success: true, managerId: manager.id }
}

// POST - Mark wheel as borrowed
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { stationId, wheelId } = await params
    const body = await request.json()
    const { borrower_name, borrower_phone, expected_return_date, deposit_type, deposit_details, notes, manager_phone, manager_password } = body

    // Verify manager credentials
    if (!manager_phone || !manager_password) {
      return NextResponse.json({ error: 'נדרש טלפון וסיסמא לביצוע פעולה זו' }, { status: 401 })
    }

    const auth = await verifyStationManager(stationId, manager_phone, manager_password)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    // Check wheel exists and is available
    const { data: wheel, error: wheelError } = await supabase
      .from('wheels')
      .select('id, is_available')
      .eq('id', wheelId)
      .eq('station_id', stationId)
      .single()

    if (wheelError || !wheel) {
      return NextResponse.json({ error: 'Wheel not found' }, { status: 404 })
    }

    if (!wheel.is_available) {
      return NextResponse.json({ error: 'הגלגל כבר מושאל' }, { status: 400 })
    }

    if (!borrower_name || !borrower_phone) {
      return NextResponse.json({ error: 'נא למלא שם וטלפון של השואל' }, { status: 400 })
    }

    // Create borrow record
    const { data: borrow, error: borrowError } = await supabase
      .from('wheel_borrows')
      .insert({
        wheel_id: wheelId,
        station_id: stationId,
        borrower_name,
        borrower_phone,
        expected_return_date,
        deposit_type,
        deposit_details,
        notes,
        status: 'borrowed',
        created_by_manager_id: auth.managerId
      })
      .select()
      .single()

    if (borrowError) {
      console.error('Error creating borrow:', borrowError)
      return NextResponse.json({ error: 'Failed to create borrow record' }, { status: 500 })
    }

    // Update wheel availability
    const { error: updateError } = await supabase
      .from('wheels')
      .update({ is_available: false })
      .eq('id', wheelId)

    if (updateError) {
      console.error('Error updating wheel availability:', updateError)
      // Rollback borrow record
      await supabase.from('wheel_borrows').delete().eq('id', borrow.id)
      return NextResponse.json({ error: 'Failed to update wheel status' }, { status: 500 })
    }

    return NextResponse.json({ borrow }, { status: 201 })
  } catch (error) {
    console.error('Error in POST borrow:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Return wheel (mark as returned)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { stationId, wheelId } = await params
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

    // Find active borrow
    const { data: borrow, error: borrowError } = await supabase
      .from('wheel_borrows')
      .select('id')
      .eq('wheel_id', wheelId)
      .eq('status', 'borrowed')
      .single()

    if (borrowError || !borrow) {
      return NextResponse.json({ error: 'לא נמצאה השאלה פעילה' }, { status: 404 })
    }

    // Update borrow record
    const { error: updateBorrowError } = await supabase
      .from('wheel_borrows')
      .update({
        status: 'returned',
        actual_return_date: new Date().toISOString(),
        returned_by_manager_id: auth.managerId
      })
      .eq('id', borrow.id)

    if (updateBorrowError) {
      console.error('Error updating borrow:', updateBorrowError)
      return NextResponse.json({ error: 'Failed to return wheel' }, { status: 500 })
    }

    // Update wheel availability
    const { error: updateWheelError } = await supabase
      .from('wheels')
      .update({ is_available: true })
      .eq('id', wheelId)

    if (updateWheelError) {
      console.error('Error updating wheel:', updateWheelError)
      return NextResponse.json({ error: 'Failed to update wheel status' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PUT borrow:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
