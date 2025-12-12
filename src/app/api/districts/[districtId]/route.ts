/**
 * District Management API
 * PUT /api/districts/[districtId] - Update district
 * DELETE /api/districts/[districtId] - Delete district
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { clearDistrictsCache } from '@/lib/districts'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type RouteParams = {
  params: Promise<{ districtId: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { districtId } = await params
    const body = await request.json()
    const { code, name, color } = body

    // Validate required fields
    if (!code || !name || !color) {
      return NextResponse.json(
        { error: 'Missing required fields: code, name, color' },
        { status: 400 }
      )
    }

    // Validate color format (hex color)
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return NextResponse.json(
        { error: 'Invalid color format. Must be hex color like #FF0000' },
        { status: 400 }
      )
    }

    // Update district
    const { data: district, error } = await supabase
      .from('districts')
      .update({ code, name, color, updated_at: new Date().toISOString() })
      .eq('id', districtId)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: 'District code already exists' },
          { status: 409 }
        )
      }
      throw error
    }

    if (!district) {
      return NextResponse.json({ error: 'District not found' }, { status: 404 })
    }

    // Clear cache so new data is fetched
    clearDistrictsCache()

    return NextResponse.json({ district })
  } catch (error) {
    console.error('Error updating district:', error)
    return NextResponse.json({ error: 'Failed to update district' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { districtId } = await params

    // Check if any stations are using this district
    const { data: stations, error: stationsError } = await supabase
      .from('wheel_stations')
      .select('id, name, district')
      .eq('district', (await supabase.from('districts').select('code').eq('id', districtId).single()).data?.code || '')

    if (stationsError && stationsError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw stationsError
    }

    if (stations && stations.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete district: it is being used by stations',
          stations: stations.map(s => s.name)
        },
        { status: 409 }
      )
    }

    // Delete district
    const { error } = await supabase
      .from('districts')
      .delete()
      .eq('id', districtId)

    if (error) throw error

    // Clear cache so new data is fetched
    clearDistrictsCache()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting district:', error)
    return NextResponse.json({ error: 'Failed to delete district' }, { status: 500 })
  }
}
