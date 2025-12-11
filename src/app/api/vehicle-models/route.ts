import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { searchParams } = new URL(request.url)

    const make = searchParams.get('make')
    const model = searchParams.get('model')
    const year = searchParams.get('year')

    let query = supabase
      .from('vehicle_models')
      .select('*')

    // Filter by make (case insensitive)
    if (make) {
      query = query.or(`make.ilike.%${make}%,make_he.ilike.%${make}%`)
    }

    // Filter by model (case insensitive)
    if (model) {
      query = query.ilike('model', `%${model}%`)
    }

    // Filter by year range
    if (year) {
      const yearNum = parseInt(year)
      query = query
        .lte('year_from', yearNum)
        .or(`year_to.gte.${yearNum},year_to.is.null`)
    }

    const { data, error } = await query.order('make_he', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ vehicles: data || [] })

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Add new vehicle model
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const body = await request.json()

    const {
      make,
      make_he,
      model,
      variants,
      year_from,
      year_to,
      bolt_count,
      bolt_spacing,
      center_bore,
      rim_size,
      tire_size_front,
      added_by
    } = body

    // Validate required fields
    if (!make || !make_he || !model || !bolt_count || !bolt_spacing) {
      return NextResponse.json({
        error: 'Missing required fields: make, make_he, model, bolt_count, bolt_spacing'
      }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('vehicle_models')
      .insert([{
        make: make.trim().toLowerCase(),
        make_he: make_he.trim(),
        model: model.trim().toLowerCase(),
        variants: variants?.trim() || null,
        year_from: year_from ? parseInt(year_from) : null,
        year_to: year_to ? parseInt(year_to) : null,
        bolt_count: parseInt(bolt_count),
        bolt_spacing: parseFloat(bolt_spacing),
        center_bore: center_bore ? parseFloat(center_bore) : null,
        rim_size: rim_size?.trim() || null,
        tire_size_front: tire_size_front?.trim() || null,
        source: 'manual',
        added_by: added_by || null
      }])
      .select()

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, vehicle: data?.[0] })

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
