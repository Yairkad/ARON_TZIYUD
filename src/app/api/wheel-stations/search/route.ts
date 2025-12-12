/**
 * Global Wheel Search API
 * GET /api/wheel-stations/search - Search wheels across all stations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rim_size = searchParams.get('rim_size')
    const bolt_count = searchParams.get('bolt_count')
    const bolt_spacing = searchParams.get('bolt_spacing')
    const district = searchParams.get('district')
    const available_only = searchParams.get('available_only') === 'true'

    // Build query
    let query = supabase
      .from('wheels')
      .select(`
        id,
        wheel_number,
        rim_size,
        bolt_count,
        bolt_spacing,
        category,
        is_donut,
        is_available,
        station_id,
        wheel_stations!inner (
          id,
          name,
          address,
          district,
          is_active,
          cities (name)
        )
      `)
      .eq('wheel_stations.is_active', true)

    // Apply filters
    if (rim_size) {
      query = query.eq('rim_size', rim_size)
    }
    if (bolt_count) {
      query = query.eq('bolt_count', parseInt(bolt_count))
    }
    if (bolt_spacing) {
      query = query.eq('bolt_spacing', parseFloat(bolt_spacing))
    }
    if (district) {
      query = query.eq('wheel_stations.district', district)
    }
    if (available_only) {
      query = query.eq('is_available', true)
    }

    const { data: wheels, error } = await query.order('rim_size')

    if (error) {
      console.error('Error searching wheels:', error)
      return NextResponse.json({ error: 'Failed to search wheels' }, { status: 500 })
    }

    // Group results by station for better display
    const stationMap = new Map<string, {
      station: {
        id: string
        name: string
        address: string
        city: string | null
        district: string | null
      }
      wheels: typeof wheels
      availableCount: number
      totalCount: number
    }>()

    wheels?.forEach(wheel => {
      const station = wheel.wheel_stations as unknown as {
        id: string
        name: string
        address: string
        district: string | null
        cities: { name: string } | null
      }

      if (!stationMap.has(station.id)) {
        stationMap.set(station.id, {
          station: {
            id: station.id,
            name: station.name,
            address: station.address,
            city: station.cities?.name || null,
            district: station.district || null
          },
          wheels: [],
          availableCount: 0,
          totalCount: 0
        })
      }

      const entry = stationMap.get(station.id)!
      entry.wheels.push(wheel)
      entry.totalCount++
      if (wheel.is_available) {
        entry.availableCount++
      }
    })

    const results = Array.from(stationMap.values())

    // Get unique filter options from all wheels (for dropdown suggestions)
    const { data: allWheels, error: filterError } = await supabase
      .from('wheels')
      .select(`
        rim_size,
        bolt_count,
        bolt_spacing,
        wheel_stations!inner (is_active)
      `)
      .eq('wheel_stations.is_active', true)

    if (filterError) {
      console.error('Error fetching filter options:', filterError)
    }

    const filterOptions = {
      rim_sizes: [...new Set(allWheels?.map(w => w.rim_size).filter(Boolean))].sort(),
      bolt_counts: [...new Set(allWheels?.map(w => w.bolt_count).filter(Boolean))].sort((a, b) => a - b),
      bolt_spacings: [...new Set(allWheels?.map(w => w.bolt_spacing).filter(Boolean))].sort((a, b) => a - b)
    }

    return NextResponse.json({
      results,
      totalWheels: wheels?.length || 0,
      totalAvailable: wheels?.filter(w => w.is_available).length || 0,
      filterOptions
    })
  } catch (error) {
    console.error('Error in GET /api/wheel-stations/search:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
