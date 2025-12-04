/**
 * Single Wheel API
 * GET /api/wheel-stations/[stationId]/wheels/[wheelId] - Get wheel details
 * PUT /api/wheel-stations/[stationId]/wheels/[wheelId] - Update wheel
 * DELETE /api/wheel-stations/[stationId]/wheels/[wheelId] - Delete wheel
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

// GET - Get wheel details with borrow info (if borrowed)
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

    // If wheel is borrowed, check if user is a manager to show borrow details
    let borrowInfo = null
    if (!wheel.is_available) {
      const auth = await verifyManager(stationId)
      if (auth.success) {
        const { data: borrow } = await supabase
          .from('wheel_borrows')
          .select('*')
          .eq('wheel_id', wheelId)
          .eq('status', 'borrowed')
          .single()

        borrowInfo = borrow
      }
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

    const auth = await verifyManager(stationId)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
    }

    const body = await request.json()
    const { wheel_number, rim_size, bolt_count, bolt_spacing, category, is_donut, notes } = body

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

    const auth = await verifyManager(stationId)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
    }

    // Check if wheel has active borrows
    const { data: wheel } = await supabase
      .from('wheels')
      .select('is_available')
      .eq('id', wheelId)
      .single()

    if (wheel && !wheel.is_available) {
      return NextResponse.json({ error: 'Cannot delete wheel that is currently borrowed' }, { status: 400 })
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
