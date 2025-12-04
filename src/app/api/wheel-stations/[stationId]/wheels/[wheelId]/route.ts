/**
 * Single Wheel API
 * GET /api/wheel-stations/[stationId]/wheels/[wheelId] - Get wheel details
 * PUT /api/wheel-stations/[stationId]/wheels/[wheelId] - Update wheel
 * DELETE /api/wheel-stations/[stationId]/wheels/[wheelId] - Delete wheel
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
async function verifyStationManager(stationId: string, phone: string, password: string): Promise<{ success: boolean; error?: string }> {
  // Get station with password and managers
  const { data: station, error } = await supabase
    .from('wheel_stations')
    .select(`
      manager_password,
      wheel_station_managers (phone)
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
  const isManager = station.wheel_station_managers.some((m: { phone: string }) =>
    m.phone.replace(/\D/g, '') === cleanPhone
  )

  if (!isManager) {
    return { success: false, error: 'מספר הטלפון לא נמצא ברשימת המנהלים' }
  }

  return { success: true }
}

// GET - Get wheel details with borrow info (public for borrowed wheel info shown on cards)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { stationId, wheelId } = await params

    const { data: wheel, error } = await supabase
      .from('wheels')
      .select('*')
      .eq('id', wheelId)
      .eq('station_id', stationId)
      .single()

    if (error || !wheel) {
      return NextResponse.json({ error: 'Wheel not found' }, { status: 404 })
    }

    // If wheel is borrowed, get borrow details
    let borrowInfo = null
    if (!wheel.is_available) {
      const { data: borrow } = await supabase
        .from('wheel_borrows')
        .select('*')
        .eq('wheel_id', wheelId)
        .eq('status', 'borrowed')
        .single()

      borrowInfo = borrow
    }

    return NextResponse.json({ wheel, borrowInfo })
  } catch (error) {
    console.error('Error in GET /api/wheel-stations/[stationId]/wheels/[wheelId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update wheel
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { stationId, wheelId } = await params
    const body = await request.json()
    const { wheel_number, rim_size, bolt_count, bolt_spacing, category, is_donut, notes, manager_phone, manager_password } = body

    // Verify manager credentials
    if (!manager_phone || !manager_password) {
      return NextResponse.json({ error: 'נדרש טלפון וסיסמא לביצוע פעולה זו' }, { status: 401 })
    }

    const auth = await verifyStationManager(stationId, manager_phone, manager_password)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const { error } = await supabase
      .from('wheels')
      .update({
        wheel_number,
        rim_size,
        bolt_count,
        bolt_spacing,
        category,
        is_donut,
        notes
      })
      .eq('id', wheelId)
      .eq('station_id', stationId)

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Wheel number already exists in this station' }, { status: 400 })
      }
      console.error('Error updating wheel:', error)
      return NextResponse.json({ error: 'Failed to update wheel' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PUT /api/wheel-stations/[stationId]/wheels/[wheelId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete wheel
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Check if wheel has active borrows
    const { data: wheel } = await supabase
      .from('wheels')
      .select('is_available')
      .eq('id', wheelId)
      .single()

    if (wheel && !wheel.is_available) {
      return NextResponse.json({ error: 'לא ניתן למחוק גלגל שמושאל כרגע' }, { status: 400 })
    }

    const { error } = await supabase
      .from('wheels')
      .delete()
      .eq('id', wheelId)
      .eq('station_id', stationId)

    if (error) {
      console.error('Error deleting wheel:', error)
      return NextResponse.json({ error: 'Failed to delete wheel' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/wheel-stations/[stationId]/wheels/[wheelId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
