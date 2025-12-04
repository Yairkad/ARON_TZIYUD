/**
 * Cities API
 * GET /api/cities - Get all active cities
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Get all active cities
export async function GET() {
  try {
    const { data: cities, error } = await supabase
      .from('cities')
      .select('id, name')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching cities:', error)
      return NextResponse.json({ error: 'Failed to fetch cities' }, { status: 500 })
    }

    return NextResponse.json({ cities: cities || [] })
  } catch (error) {
    console.error('Error in GET /api/cities:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
