/**
 * Wheel Stations Admin API (password protected)
 * GET /api/wheel-stations/admin - List all stations with full details
 * POST /api/wheel-stations/admin - Create a new station
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WHEELS_ADMIN_PASSWORD = process.env.WHEELS_ADMIN_PASSWORD || 'wheels2024'

// GET - List all stations with full details (no auth needed for listing)
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
        is_active,
        manager_password,
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
        wheels: undefined // Don't send individual wheels
      }
    })

    return NextResponse.json({ stations: stationsWithStats })
  } catch (error) {
    console.error('Error in GET /api/wheel-stations/admin:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new station (password protected)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { admin_password, name, address, city_id, district, manager_password, managers } = body

    // Verify admin password
    if (admin_password !== WHEELS_ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'סיסמת מנהל שגויה' }, { status: 403 })
    }

    if (!name) {
      return NextResponse.json({ error: 'שם תחנה הוא שדה חובה' }, { status: 400 })
    }

    // Create station
    const stationData: {
      name: string
      address?: string
      city_id?: string
      district?: string
      manager_password?: string
      is_active: boolean
    } = {
      name,
      is_active: true
    }

    if (address) stationData.address = address
    if (city_id) stationData.city_id = city_id
    if (district) stationData.district = district
    if (manager_password) stationData.manager_password = manager_password

    const { data: station, error: stationError } = await supabase
      .from('wheel_stations')
      .insert(stationData)
      .select()
      .single()

    if (stationError) {
      console.error('Error creating station:', stationError)
      return NextResponse.json({ error: 'שגיאה ביצירת תחנה' }, { status: 500 })
    }

    // Add managers if provided
    if (managers && managers.length > 0) {
      const managersWithStation = managers.map((m: { full_name: string; phone: string; role?: string; is_primary?: boolean }) => ({
        station_id: station.id,
        full_name: m.full_name,
        phone: m.phone,
        role: m.role || 'מנהל תחנה',
        is_primary: m.is_primary || false
      }))

      const { error: managersError } = await supabase
        .from('wheel_station_managers')
        .insert(managersWithStation)

      if (managersError) {
        console.error('Error adding managers:', managersError)
      }
    }

    return NextResponse.json({ station }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/wheel-stations/admin:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
