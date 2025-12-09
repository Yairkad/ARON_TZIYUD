/**
 * Wheel Borrows History API
 * GET /api/wheel-stations/[stationId]/borrows - Get borrow history for station
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

// GET - Get borrow history for station
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { stationId } = await params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'borrowed', 'returned', or null for all
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query
    let query = supabase
      .from('wheel_borrows')
      .select(`
        id,
        wheel_id,
        borrower_name,
        borrower_phone,
        borrower_id_number,
        borrower_address,
        vehicle_model,
        borrow_date,
        expected_return_date,
        actual_return_date,
        deposit_type,
        deposit_details,
        notes,
        status,
        signature_data,
        signed_at,
        created_at,
        wheels (wheel_number, rim_size, bolt_count, bolt_spacing)
      `)
      .eq('station_id', stationId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: borrows, error } = await query

    if (error) {
      console.error('Error fetching borrows:', error)
      return NextResponse.json({ error: 'Failed to fetch borrows' }, { status: 500 })
    }

    // Calculate stats
    const { data: stats } = await supabase
      .from('wheel_borrows')
      .select('status, signature_data')
      .eq('station_id', stationId)

    const pending = stats?.filter(s => s.status === 'pending').length || 0
    const totalBorrowed = stats?.filter(s => s.status === 'borrowed').length || 0
    const totalReturned = stats?.filter(s => s.status === 'returned').length || 0
    const waitingSignature = stats?.filter(s => s.status === 'borrowed' && !s.signature_data).length || 0
    const signed = stats?.filter(s => s.status === 'borrowed' && s.signature_data).length || 0

    return NextResponse.json({
      borrows: borrows?.map(b => ({
        ...b,
        is_signed: !!b.signature_data,
        // Don't send full signature data to client, just the status
        signature_data: undefined
      })),
      stats: {
        pending,
        totalBorrowed,
        totalReturned,
        waitingSignature,
        signed
      }
    })
  } catch (error) {
    console.error('Error in GET /api/wheel-stations/[stationId]/borrows:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
