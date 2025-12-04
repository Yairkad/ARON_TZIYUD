/**
 * Station Manager Authentication API
 * POST /api/wheel-stations/[stationId]/auth - Login with phone + password
 * PUT /api/wheel-stations/[stationId]/auth - Change password (requires current login)
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

// POST - Login (verify phone is manager + password matches)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { stationId } = await params
    const body = await request.json()
    const { phone, password } = body

    if (!phone || !password) {
      return NextResponse.json({ error: 'Phone and password are required' }, { status: 400 })
    }

    // Get station with password
    const { data: station, error } = await supabase
      .from('wheel_stations')
      .select(`
        id,
        manager_password,
        wheel_station_managers (
          id,
          full_name,
          phone,
          role
        )
      `)
      .eq('id', stationId)
      .single()

    if (error || !station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 })
    }

    // Check if station has a password set
    if (!station.manager_password) {
      return NextResponse.json({
        error: 'לתחנה זו לא הוגדרה סיסמא. יש לפנות לסופר-אדמין.',
        code: 'NO_PASSWORD_SET'
      }, { status: 400 })
    }

    // Verify password
    if (station.manager_password !== password) {
      return NextResponse.json({ error: 'סיסמא שגויה' }, { status: 401 })
    }

    // Verify phone is in managers list
    const cleanPhone = phone.replace(/\D/g, '')
    const manager = station.wheel_station_managers.find((m: { phone: string }) =>
      m.phone.replace(/\D/g, '') === cleanPhone
    )

    if (!manager) {
      return NextResponse.json({ error: 'מספר הטלפון לא נמצא ברשימת המנהלים' }, { status: 401 })
    }

    // Generate a simple token (in production, use JWT or similar)
    const token = Buffer.from(`${stationId}:${manager.id}:${Date.now()}`).toString('base64')

    return NextResponse.json({
      success: true,
      manager: {
        id: manager.id,
        full_name: manager.full_name,
        phone: manager.phone,
        role: manager.role
      },
      token
    })
  } catch (error) {
    console.error('Error in POST /api/wheel-stations/[stationId]/auth:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Change password (requires being logged in as manager)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { stationId } = await params
    const body = await request.json()
    const { phone, current_password, new_password } = body

    if (!phone || !current_password || !new_password) {
      return NextResponse.json({ error: 'Phone, current password and new password are required' }, { status: 400 })
    }

    if (new_password.length < 4) {
      return NextResponse.json({ error: 'הסיסמא חייבת להכיל לפחות 4 תווים' }, { status: 400 })
    }

    // Get station
    const { data: station, error } = await supabase
      .from('wheel_stations')
      .select(`
        id,
        manager_password,
        wheel_station_managers (phone)
      `)
      .eq('id', stationId)
      .single()

    if (error || !station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 })
    }

    // Verify phone is in managers list
    const cleanPhone = phone.replace(/\D/g, '')
    const isManager = station.wheel_station_managers.some((m: { phone: string }) =>
      m.phone.replace(/\D/g, '') === cleanPhone
    )

    if (!isManager) {
      return NextResponse.json({ error: 'אינך מנהל תחנה מורשה' }, { status: 403 })
    }

    // Verify current password
    if (station.manager_password !== current_password) {
      return NextResponse.json({ error: 'סיסמא נוכחית שגויה' }, { status: 401 })
    }

    // Update password
    const { error: updateError } = await supabase
      .from('wheel_stations')
      .update({ manager_password: new_password })
      .eq('id', stationId)

    if (updateError) {
      console.error('Error updating password:', updateError)
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'הסיסמא שונתה בהצלחה'
    })
  } catch (error) {
    console.error('Error in PUT /api/wheel-stations/[stationId]/auth:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
