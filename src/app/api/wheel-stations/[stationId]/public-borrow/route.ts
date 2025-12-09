/**
 * Public Wheel Borrow API
 * POST /api/wheel-stations/[stationId]/public-borrow - Submit borrow request (public, no auth required)
 *
 * This API is for borrowers to submit a borrow request via sign form.
 * The request goes to 'pending' status and requires manager approval to become 'borrowed'.
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

// POST - Submit borrow request (public endpoint for sign form)
// Creates a pending request that requires manager approval
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { stationId } = await params
    const body = await request.json()
    const {
      wheel_id,
      borrower_name,
      borrower_phone,
      borrower_id_number,
      borrower_address,
      vehicle_model,
      borrow_date,
      deposit_type,
      notes,
      signature_data,
      terms_accepted
    } = body

    // Validate required fields
    if (!wheel_id) {
      return NextResponse.json({ error: 'נא לבחור צמיג' }, { status: 400 })
    }
    if (!borrower_name || !borrower_phone) {
      return NextResponse.json({ error: 'נא למלא שם וטלפון' }, { status: 400 })
    }
    if (!borrower_id_number || borrower_id_number.length < 9) {
      return NextResponse.json({ error: 'נא למלא תעודת זהות (9 ספרות)' }, { status: 400 })
    }
    if (!borrower_address) {
      return NextResponse.json({ error: 'נא למלא כתובת' }, { status: 400 })
    }
    if (!vehicle_model) {
      return NextResponse.json({ error: 'נא למלא דגם הרכב' }, { status: 400 })
    }
    if (!deposit_type) {
      return NextResponse.json({ error: 'נא לבחור אופן תשלום פיקדון' }, { status: 400 })
    }
    if (!signature_data) {
      return NextResponse.json({ error: 'נא לחתום על הטופס' }, { status: 400 })
    }
    if (!terms_accepted) {
      return NextResponse.json({ error: 'נא לאשר את תנאי ההשאלה' }, { status: 400 })
    }

    // Check station exists
    const { data: station, error: stationError } = await supabase
      .from('wheel_stations')
      .select('id, name')
      .eq('id', stationId)
      .single()

    if (stationError || !station) {
      return NextResponse.json({ error: 'תחנה לא נמצאה' }, { status: 404 })
    }

    // Check wheel exists, belongs to this station, and is available
    const { data: wheel, error: wheelError } = await supabase
      .from('wheels')
      .select('id, wheel_number, is_available')
      .eq('id', wheel_id)
      .eq('station_id', stationId)
      .single()

    if (wheelError || !wheel) {
      return NextResponse.json({ error: 'הצמיג לא נמצא' }, { status: 404 })
    }

    if (!wheel.is_available) {
      return NextResponse.json({ error: 'הצמיג כבר מושאל' }, { status: 400 })
    }

    // Calculate expected return date (72 hours from borrow date)
    const borrowDateTime = borrow_date ? new Date(borrow_date) : new Date()
    const expectedReturn = new Date(borrowDateTime.getTime() + 72 * 60 * 60 * 1000)

    // Create borrow request with 'pending' status - requires manager approval
    const { data: borrow, error: borrowError } = await supabase
      .from('wheel_borrows')
      .insert({
        wheel_id: wheel_id,
        station_id: stationId,
        borrower_name,
        borrower_phone,
        borrower_id_number,
        borrower_address,
        vehicle_model,
        borrow_date: borrowDateTime.toISOString(),
        expected_return_date: expectedReturn.toISOString(),
        deposit_type,
        notes,
        signature_data,
        signed_at: new Date().toISOString(),
        terms_accepted: true,
        status: 'pending' // Requires manager approval
      })
      .select()
      .single()

    if (borrowError) {
      console.error('Error creating borrow request:', borrowError)
      return NextResponse.json({ error: 'שגיאה ביצירת בקשת השאלה' }, { status: 500 })
    }

    // Note: Wheel availability is NOT updated here
    // Manager must approve the request to mark wheel as borrowed

    return NextResponse.json({
      success: true,
      pending: true,
      message: 'הבקשה נשלחה בהצלחה וממתינה לאישור מנהל',
      borrow: {
        id: borrow.id,
        wheel_number: wheel.wheel_number,
        borrower_name,
        expected_return_date: expectedReturn.toISOString()
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST public-borrow:', error)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}
