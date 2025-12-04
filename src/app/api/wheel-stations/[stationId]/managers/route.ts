/**
 * Station Managers API
 * GET /api/wheel-stations/[stationId]/managers - Get managers list (public)
 * PUT /api/wheel-stations/[stationId]/managers - Update managers (station manager or admin password)
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

interface Manager {
  id?: string
  full_name: string
  phone: string
  role?: string
  is_primary?: boolean
}

// Helper to verify station manager access (by phone and password)
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

// GET - Get managers for station
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { stationId } = await params

    const { data: managers, error } = await supabase
      .from('wheel_station_managers')
      .select('*')
      .eq('station_id', stationId)
      .order('is_primary', { ascending: false })

    if (error) {
      console.error('Error fetching managers:', error)
      return NextResponse.json({ error: 'Failed to fetch managers' }, { status: 500 })
    }

    return NextResponse.json({ managers: managers || [] })
  } catch (error) {
    console.error('Error in GET managers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update managers list
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { stationId } = await params
    const body = await request.json()
    const { managers, manager_phone, manager_password } = body as {
      managers: Manager[]
      manager_phone?: string
      manager_password?: string
    }

    // Verify station manager access
    if (!manager_phone || !manager_password) {
      return NextResponse.json({ error: 'נדרש טלפון וסיסמא לעדכון' }, { status: 401 })
    }

    const auth = await verifyStationManager(stationId, manager_phone, manager_password)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 403 })
    }

    if (!managers || !Array.isArray(managers)) {
      return NextResponse.json({ error: 'Managers array required' }, { status: 400 })
    }

    // Validate max 4 managers
    if (managers.length > 4) {
      return NextResponse.json({ error: 'Maximum 4 managers per station' }, { status: 400 })
    }

    // Validate each manager has required fields
    for (const manager of managers) {
      if (!manager.full_name || !manager.phone) {
        return NextResponse.json({ error: 'Each manager must have full_name and phone' }, { status: 400 })
      }
    }

    // Delete existing managers
    await supabase
      .from('wheel_station_managers')
      .delete()
      .eq('station_id', stationId)

    // Add new managers
    if (managers.length > 0) {
      const managersWithStation = managers.map(m => ({
        station_id: stationId,
        full_name: m.full_name,
        phone: m.phone,
        role: m.role || 'מנהל תחנה',
        is_primary: m.is_primary || false
      }))

      const { error: insertError } = await supabase
        .from('wheel_station_managers')
        .insert(managersWithStation)

      if (insertError) {
        console.error('Error inserting managers:', insertError)
        return NextResponse.json({ error: 'Failed to update managers' }, { status: 500 })
      }
    }

    // Fetch updated managers
    const { data: updatedManagers } = await supabase
      .from('wheel_station_managers')
      .select('*')
      .eq('station_id', stationId)
      .order('is_primary', { ascending: false })

    return NextResponse.json({
      success: true,
      managers: updatedManagers || [],
      message: 'אנשי הקשר עודכנו בהצלחה'
    })
  } catch (error) {
    console.error('Error in PUT managers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
