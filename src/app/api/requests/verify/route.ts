import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { hashToken, isTokenExpired } from '@/lib/token'

/**
 * POST /api/requests/verify
 * Verifies a token and returns request details with full request information
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'טוקן חסר' },
        { status: 400 }
      )
    }

    // Hash the token to search in database
    const tokenHash = hashToken(token)

    // Find request by token hash
    const { data: equipmentRequest, error } = await supabaseServer
      .from('equipment_requests')
      .select(`
        *,
        city:cities(*)
      `)
      .eq('token_hash', tokenHash)
      .single()

    if (error || !equipmentRequest) {
      return NextResponse.json(
        { error: 'בקשה לא נמצאה' },
        { status: 404 }
      )
    }

    // Check if token is expired
    if (isTokenExpired(equipmentRequest.expires_at)) {
      // Auto-update status to expired if not already
      if (equipmentRequest.status === 'pending') {
        await supabaseServer
          .from('equipment_requests')
          .update({ status: 'expired' })
          .eq('id', equipmentRequest.id)
      }

      return NextResponse.json(
        { error: 'הטוקן פג תוקף', expired: true },
        { status: 410 }
      )
    }

    // Fetch request items with equipment details
    const { data: items, error: itemsError } = await supabaseServer
      .from('request_items')
      .select(`
        *,
        equipment:equipment(*)
      `)
      .eq('request_id', equipmentRequest.id)

    if (itemsError) {
      console.error('Error fetching request items:', itemsError)
      return NextResponse.json(
        { error: 'שגיאה בטעינת פריטי בקשה' },
        { status: 500 }
      )
    }

    const requestWithItems = {
      ...equipmentRequest,
      items: items || []
    }

    return NextResponse.json({
      success: true,
      request: requestWithItems
    })
  } catch (error) {
    console.error('Verify token error:', error)
    return NextResponse.json(
      { error: 'שגיאה באימות טוקן' },
      { status: 500 }
    )
  }
}
