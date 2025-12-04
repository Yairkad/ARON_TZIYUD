/**
 * Wheel Borrow API
 * POST /api/wheel-stations/[stationId]/wheels/[wheelId]/borrow - Mark wheel as borrowed
 * PUT /api/wheel-stations/[stationId]/wheels/[wheelId]/borrow - Return wheel
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RouteParams {
  params: Promise<{ stationId: string; wheelId: string }>
}

// Helper to verify station manager or super admin
async function verifyManager(stationId: string): Promise<{ success: boolean; error?: string; userId?: string }> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value

  if (!accessToken) {
    return { success: false, error: 'Unauthorized' }
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role, phone')
    .eq('id', user.id)
    .single()

  // Super admins can manage all stations
  if (userData?.role === 'super_admin') {
    return { success: true, userId: user.id }
  }

  // Check if user is a station manager by phone number
  if (userData?.phone) {
    const { data: manager } = await supabase
      .from('wheel_station_managers')
      .select('id')
      .eq('station_id', stationId)
      .eq('phone', userData.phone)
      .single()

    if (manager) {
      return { success: true, userId: user.id }
    }
  }

  return { success: false, error: 'Forbidden - Station manager only' }
}

// POST - Mark wheel as borrowed
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { stationId, wheelId } = await params

    const auth = await verifyManager(stationId)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
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
      return NextResponse.json({ error: 'Wheel is already borrowed' }, { status: 400 })
    }

    const body = await request.json()
    const { borrower_name, borrower_phone, expected_return_date, deposit_type, deposit_details, notes } = body

    if (!borrower_name || !borrower_phone) {
      return NextResponse.json({ error: 'Borrower name and phone are required' }, { status: 400 })
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
        created_by_manager_id: auth.userId
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

    const auth = await verifyManager(stationId)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
    }

    // Find active borrow
    const { data: borrow, error: borrowError } = await supabase
      .from('wheel_borrows')
      .select('id')
      .eq('wheel_id', wheelId)
      .eq('status', 'borrowed')
      .single()

    if (borrowError || !borrow) {
      return NextResponse.json({ error: 'No active borrow found' }, { status: 404 })
    }

    // Update borrow record
    const { error: updateBorrowError } = await supabase
      .from('wheel_borrows')
      .update({
        status: 'returned',
        actual_return_date: new Date().toISOString(),
        returned_by_manager_id: auth.userId
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
