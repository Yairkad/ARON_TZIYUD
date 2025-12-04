/**
 * Wheels API for a specific station
 * GET /api/wheel-stations/[stationId]/wheels - Get all wheels
 * POST /api/wheel-stations/[stationId]/wheels - Add a new wheel (manager only)
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

// GET - Get all wheels for a station (public access)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { stationId } = await params

    const { data: wheels, error } = await supabase
      .from('wheels')
      .select('*')
      .eq('station_id', stationId)
      .order('wheel_number')

    if (error) {
      console.error('Error fetching wheels:', error)
      return NextResponse.json({ error: 'Failed to fetch wheels' }, { status: 500 })
    }

    return NextResponse.json({ wheels: wheels || [] })
  } catch (error) {
    console.error('Error in GET /api/wheel-stations/[stationId]/wheels:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add a new wheel (manager only)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { stationId } = await params

    const auth = await verifyManager(stationId)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
    }

    const body = await request.json()
    const { wheel_number, rim_size, bolt_count, bolt_spacing, category, is_donut, notes } = body

    if (!wheel_number || !rim_size || !bolt_count || !bolt_spacing) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: wheel, error } = await supabase
      .from('wheels')
      .insert({
        station_id: stationId,
        wheel_number,
        rim_size,
        bolt_count,
        bolt_spacing,
        category,
        is_donut: is_donut || false,
        notes,
        is_available: true
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'Wheel number already exists in this station' }, { status: 400 })
      }
      console.error('Error creating wheel:', error)
      return NextResponse.json({ error: 'Failed to create wheel' }, { status: 500 })
    }

    return NextResponse.json({ wheel }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/wheel-stations/[stationId]/wheels:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
