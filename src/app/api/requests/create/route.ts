import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { createRequestToken } from '@/lib/token'
import { CreateRequestForm } from '@/types'

/**
 * POST /api/requests/create
 * Creates a new equipment request with a secure token
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateRequestForm = await request.json()

    // Validate request body
    if (!body.requester_name || !body.requester_phone || !body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'חסרים פרטים נדרשים' },
        { status: 400 }
      )
    }

    // Extract city_id from the first item's equipment
    const { data: equipment, error: eqError } = await supabaseServer
      .from('equipment')
      .select('city_id')
      .eq('id', body.items[0].equipment_id)
      .single()

    if (eqError || !equipment) {
      return NextResponse.json(
        { error: 'ציוד לא נמצא' },
        { status: 404 }
      )
    }

    const cityId = equipment.city_id

    // Get city settings
    const { data: city, error: cityError } = await supabaseServer
      .from('cities')
      .select('require_call_id, request_mode')
      .eq('id', cityId)
      .single()

    if (cityError || !city) {
      return NextResponse.json(
        { error: 'עיר לא נמצאה' },
        { status: 404 }
      )
    }

    // Validate call_id if required
    if (city.require_call_id && !body.call_id) {
      return NextResponse.json(
        { error: 'נדרש מזהה קריאה' },
        { status: 400 }
      )
    }

    // Check if city is in request mode
    if (city.request_mode !== 'request') {
      return NextResponse.json(
        { error: 'עיר זו פועלת במצב השאלה ישיר' },
        { status: 400 }
      )
    }

    // Validate all items
    for (const item of body.items) {
      const { data: eq, error } = await supabaseServer
        .from('equipment')
        .select('quantity, is_consumable, equipment_status')
        .eq('id', item.equipment_id)
        .eq('city_id', cityId)
        .single()

      if (error || !eq) {
        return NextResponse.json(
          { error: `ציוד לא נמצא: ${item.equipment_id}` },
          { status: 404 }
        )
      }

      // Check equipment status
      if (eq.equipment_status !== 'working') {
        return NextResponse.json(
          { error: 'לא ניתן לבקש ציוד תקול' },
          { status: 400 }
        )
      }

      // Check quantity
      if (!eq.is_consumable && item.quantity !== 1) {
        return NextResponse.json(
          { error: 'ציוד לא מתכלה - כמות חייבת להיות 1' },
          { status: 400 }
        )
      }

      if (eq.is_consumable && item.quantity > eq.quantity) {
        return NextResponse.json(
          { error: 'אין מספיק כמות במלאי' },
          { status: 400 }
        )
      }

      if (!eq.is_consumable && eq.quantity < 1) {
        return NextResponse.json(
          { error: 'הציוד אינו זמין כרגע' },
          { status: 400 }
        )
      }
    }

    // Generate token
    const { token, tokenHash, expiresAt } = createRequestToken()

    // Create request
    const { data: newRequest, error: createError } = await supabaseServer
      .from('equipment_requests')
      .insert({
        city_id: cityId,
        requester_name: body.requester_name,
        requester_phone: body.requester_phone,
        call_id: body.call_id || null,
        token: token,  // Store original token for sharing
        token_hash: tokenHash,
        expires_at: expiresAt,
        status: 'pending'
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating request:', createError)
      console.error('Request data:', {
        city_id: cityId,
        requester_name: body.requester_name,
        requester_phone: body.requester_phone,
        call_id: body.call_id || null,
        token_hash: tokenHash,
        expires_at: expiresAt
      })
      return NextResponse.json(
        { error: 'שגיאה ביצירת בקשה: ' + (createError.message || createError.toString()) },
        { status: 500 }
      )
    }

    // Create request items
    const itemsToInsert = body.items.map(item => ({
      request_id: newRequest.id,
      equipment_id: item.equipment_id,
      quantity: item.quantity
    }))

    const { error: itemsError } = await supabaseServer
      .from('request_items')
      .insert(itemsToInsert)

    if (itemsError) {
      console.error('Error creating request items:', itemsError)
      console.error('Items data:', itemsToInsert)
      // Rollback request
      await supabaseServer
        .from('equipment_requests')
        .delete()
        .eq('id', newRequest.id)

      return NextResponse.json(
        { error: 'שגיאה ביצירת פריטי בקשה: ' + (itemsError.message || itemsError.toString()) },
        { status: 500 }
      )
    }

    console.log('Request created:', {
      id: newRequest.id,
      city_id: cityId,
      requester: body.requester_name,
      items_count: body.items.length,
      expires_at: expiresAt
    })

    // Send push notification to city managers (fire and forget)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cityId,
          title: 'בקשה חדשה!',
          body: `${body.requester_name} שלח/ה בקשה לציוד`,
          url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/city/${cityId}/admin`
        })
      }).catch(err => {
        // Don't fail the request if push fails
        console.error('Failed to send push notification:', err)
      })
    } catch (pushError) {
      console.error('Error sending push notification:', pushError)
      // Continue anyway - push failure shouldn't block request creation
    }

    return NextResponse.json({
      success: true,
      token,
      requestId: newRequest.id,
      expiresAt
    })
  } catch (error: any) {
    console.error('Create request error:', error)
    return NextResponse.json(
      { error: 'שגיאה בתהליך יצירת בקשה: ' + (error.message || error.toString()) },
      { status: 500 }
    )
  }
}
