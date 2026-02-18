import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/maps/cabinets - Returns list of cabinets with approximate locations
export async function GET(request: NextRequest) {
  try {
    // Fetch all active cities with any location data (public or token)
    const { data: cities, error } = await supabase
      .from('cities')
      .select('id, name, public_lat, public_lng, token_lat, token_lng, manager1_name, manager1_phone')
      .eq('is_active', true)
      .or('public_lat.not.is.null,token_lat.not.is.null')

    if (error) {
      console.error('Error fetching cities:', error)
      return NextResponse.json(
        { error: 'Failed to fetch cabinets' },
        { status: 500 }
      )
    }

    // Return public location data, falling back to token coords if public coords are missing
    const cabinets = cities
      .filter(city => (city.public_lat ?? city.token_lat) !== null)
      .map(city => ({
        id: city.id,
        name: city.name,
        public_lat: city.public_lat ?? city.token_lat,
        public_lng: city.public_lng ?? city.token_lng,
        manager_name: city.manager1_name,
        manager_phone: city.manager1_phone
      }))

    return NextResponse.json({ cabinets })
  } catch (error) {
    console.error('Error in /api/maps/cabinets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
