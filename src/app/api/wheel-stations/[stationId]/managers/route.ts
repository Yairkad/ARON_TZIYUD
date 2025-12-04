/**
 * Station Managers API (for city managers)
 * GET /api/wheel-stations/[stationId]/managers - Get managers list
 * PUT /api/wheel-stations/[stationId]/managers - Update managers (city manager or super admin)
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

interface Manager {
  id?: string
  full_name: string
  phone: string
  role?: string
  is_primary?: boolean
}

// Helper to verify city manager or super admin
async function verifyCityManagerOrAdmin(stationId: string): Promise<{ success: boolean; error?: string; userId?: string }> {
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
    .select('role, city_id')
    .eq('id', user.id)
    .single()

  // Super admins can manage all stations
  if (userData?.role === 'super_admin') {
    return { success: true, userId: user.id }
  }

  // City managers can only manage stations in their city
  if (userData?.role === 'city_manager' && userData.city_id) {
    // Check if station belongs to this city
    const { data: station } = await supabase
      .from('wheel_stations')
      .select('city_id')
      .eq('id', stationId)
      .single()

    if (station && station.city_id === userData.city_id) {
      return { success: true, userId: user.id }
    }
  }

  return { success: false, error: 'Forbidden - City manager or super admin only' }
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

    const auth = await verifyCityManagerOrAdmin(stationId)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
    }

    const body = await request.json()
    const { managers } = body as { managers: Manager[] }

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
