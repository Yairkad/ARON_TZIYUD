/**
 * Single Wheel Station API
 * GET /api/wheel-stations/[stationId] - Get station details with all wheels
 * PUT /api/wheel-stations/[stationId] - Update station (super admin only)
 * DELETE /api/wheel-stations/[stationId] - Delete station (super admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RouteParams {
  params: Promise<{ stationId: string }>
}

// GET - Get station details with all wheels (public access)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { stationId } = await params

    const { data: station, error } = await supabase
      .from('wheel_stations')
      .select(`
        id,
        name,
        address,
        city_id,
        is_active,
        cities (name),
        wheel_station_managers (
          id,
          full_name,
          phone,
          role,
          is_primary
        )
      `)
      .eq('id', stationId)
      .single()

    if (error || !station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 })
    }

    // Get wheels separately with availability status
    const { data: wheels } = await supabase
      .from('wheels')
      .select('*')
      .eq('station_id', stationId)
      .order('wheel_number')

    return NextResponse.json({
      station: {
        ...station,
        wheels: wheels || [],
        totalWheels: wheels?.length || 0,
        availableWheels: wheels?.filter(w => w.is_available).length || 0
      }
    })
  } catch (error) {
    console.error('Error in GET /api/wheel-stations/[stationId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper to verify super admin
async function verifySuperAdmin(): Promise<{ success: boolean; error?: string }> {
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
    .select('role')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'super_admin') {
    return { success: false, error: 'Forbidden - Super admin only' }
  }

  return { success: true }
}

// PUT - Update station
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await verifySuperAdmin()
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
    }

    const { stationId } = await params
    const body = await request.json()
    const { name, address, city_id, is_active, managers } = body

    // Update station
    const { error: updateError } = await supabase
      .from('wheel_stations')
      .update({ name, address, city_id, is_active })
      .eq('id', stationId)

    if (updateError) {
      console.error('Error updating station:', updateError)
      return NextResponse.json({ error: 'Failed to update station' }, { status: 500 })
    }

    // Update managers if provided
    if (managers !== undefined) {
      // Delete existing managers
      await supabase
        .from('wheel_station_managers')
        .delete()
        .eq('station_id', stationId)

      // Add new managers
      if (managers.length > 0) {
        const managersWithStation = managers.map((m: { full_name: string; phone: string; role?: string; is_primary?: boolean }) => ({
          ...m,
          station_id: stationId
        }))

        const { error: managersError } = await supabase
          .from('wheel_station_managers')
          .insert(managersWithStation)

        if (managersError) {
          console.error('Error updating managers:', managersError)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PUT /api/wheel-stations/[stationId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete station
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await verifySuperAdmin()
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
    }

    const { stationId } = await params

    const { error } = await supabase
      .from('wheel_stations')
      .delete()
      .eq('id', stationId)

    if (error) {
      console.error('Error deleting station:', error)
      return NextResponse.json({ error: 'Failed to delete station' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/wheel-stations/[stationId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
