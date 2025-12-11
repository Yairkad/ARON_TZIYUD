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

    // Try to find manager in wheel stations
    const { data: wheelManagers, error: wheelError } = await supabase
      .from('wheel_station_managers')
      .select('*, wheel_stations(id, name, manager_password)')
      .eq('phone', phone)
      .limit(1)

    console.log('Wheel managers search:', { phone, wheelManagers, wheelError })

    if (wheelManagers && wheelManagers.length > 0) {
      const manager = wheelManagers[0]
      const station = manager.wheel_stations

      // Verify password (station manager password)
      if (station?.manager_password !== password) {
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
          station_name: station.name,
          type: 'wheel_station'
        }
      })
    }

    // Try to find manager in city managers (equipment cabinets)
    const { data: cityManagers, error: cityError } = await supabase
      .from('city_managers')
      .select('*, cities(id, name, password)')
      .eq('phone', phone)
      .limit(1)

    console.log('City managers search:', { phone, cityManagers, cityError })

    if (cityManagers && cityManagers.length > 0) {
      const manager = cityManagers[0]
      const city = manager.cities

      // Verify password (city password)
      if (city?.password !== password) {
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
          city_id: city.id,
          city_name: city.name,
          type: 'city'
        }
      })
    }

    // No manager found with this phone number
    return NextResponse.json(
      { error: 'מספר טלפון לא נמצא במערכת' },
      { status: 401 }
    )

  } catch (error: any) {
    console.error('Auth error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
