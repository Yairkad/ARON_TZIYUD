/**
 * Districts Management API
 * GET /api/districts - Get all districts
 * POST /api/districts - Create new district
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data: districts, error } = await supabase
      .from('districts')
      .select('*')
      .order('name')

    if (error) throw error

    return NextResponse.json({ districts })
  } catch (error) {
    console.error('Error fetching districts:', error)
    return NextResponse.json({ error: 'Failed to fetch districts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Create district
    const { data: district, error } = await supabase
      .from('districts')
      .insert({ code, name, color })
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

    return NextResponse.json({ district }, { status: 201 })
  } catch (error) {
    console.error('Error creating district:', error)
    return NextResponse.json({ error: 'Failed to create district' }, { status: 500 })
  }
}
