import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { phone, password } = await request.json()

    if (!phone || !password) {
      return NextResponse.json(
        { error: 'Missing phone or password' },
        { status: 400 }
      )
    }

    // Try to find manager by phone
    const { data: managers, error } = await supabase
      .from('wheel_station_managers')
      .select('*, wheel_stations(id, name, password)')
      .eq('phone', phone)
      .limit(1)

    if (error || !managers || managers.length === 0) {
      return NextResponse.json(
        { error: 'מספר טלפון לא נמצא' },
        { status: 401 }
      )
    }

    const manager = managers[0]
    const station = manager.wheel_stations

    // Verify password (station password)
    if (station?.password !== password) {
      return NextResponse.json(
        { error: 'סיסמה שגויה' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      manager: {
        id: manager.id,
        full_name: manager.full_name,
        phone: manager.phone,
        station_id: station.id,
        station_name: station.name
      }
    })

  } catch (error: any) {
    console.error('Auth error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
