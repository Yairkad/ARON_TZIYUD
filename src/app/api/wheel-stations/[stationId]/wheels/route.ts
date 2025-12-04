/**
 * Wheels API for a specific station
 * GET /api/wheel-stations/[stationId]/wheels - Get all wheels
 * POST /api/wheel-stations/[stationId]/wheels - Add a new wheel (manager only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RouteParams {
  params: Promise<{ stationId: string }>
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
