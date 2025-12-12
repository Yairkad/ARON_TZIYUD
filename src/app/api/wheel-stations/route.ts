/**
 * Wheel Stations API
 * GET /api/wheel-stations - List all active wheel stations
 * POST /api/wheel-stations - Create a new station (super admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - List all active wheel stations (public access)
export async function GET() {
  try {
    const { data: stations, error } = await supabase
      .from('wheel_stations')
      .select(`
        id,
        name,
        address,
        city_id,
        district,
        cities (name),
        wheel_station_managers (
          id,
          full_name,
          phone,
          role,
          is_primary
        ),
        wheels (
          id,
          is_available
        )
      `)
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching wheel stations:', error)
      return NextResponse.json({ error: 'Failed to fetch stations' }, { status: 500 })
    }

    // Calculate wheel stats for each station
    const stationsWithStats = stations?.map(station => {
      const wheels = station.wheels || []
      return {
        ...station,
        totalWheels: wheels.length,
        availableWheels: wheels.filter((w: { is_available: boolean }) => w.is_available).length,
        wheels: undefined // Don't send individual wheels in list view
      }
    })

    return NextResponse.json({ stations: stationsWithStats })
  } catch (error) {
    console.error('Error in GET /api/wheel-stations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new wheel station (super admin only)
export async function POST(request: NextRequest) {
  try {
    // Verify super admin
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - Super admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { name, address, city_id, district, managers, manager_password } = body

    if (!name) {
      return NextResponse.json({ error: 'Station name is required' }, { status: 400 })
    }

    // Create station with optional password
    const stationData: { name: string; address?: string; city_id?: string; district?: string; manager_password?: string } = { name, address, city_id }
    if (district) {
      stationData.district = district
    }
    if (manager_password) {
      stationData.manager_password = manager_password
    }

    const { data: station, error: stationError } = await supabase
      .from('wheel_stations')
      .insert(stationData)
      .select()
      .single()

    if (stationError) {
      console.error('Error creating station:', stationError)
      return NextResponse.json({ error: 'Failed to create station' }, { status: 500 })
    }

    // Add managers if provided
    if (managers && managers.length > 0) {
      const managersWithStation = managers.map((m: { full_name: string; phone: string; role?: string; is_primary?: boolean }) => ({
        ...m,
        station_id: station.id
      }))

      const { error: managersError } = await supabase
        .from('wheel_station_managers')
        .insert(managersWithStation)

      if (managersError) {
        console.error('Error adding managers:', managersError)
        // Station was created but managers failed - log but don't fail
      }
    }

    return NextResponse.json({ station }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/wheel-stations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
