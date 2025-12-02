import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { createRequestToken } from '@/lib/token'
import { CreateRequestForm } from '@/types'
import { sendNewRequestEmail } from '@/lib/email'

/**
 * Calculate distance between two points using Haversine formula
 * @returns distance in kilometers
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

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

    // Get city_id - prefer from body (sent by client), fallback to equipment lookup
    let cityId: string

    if (body.city_id) {
      // Use city_id from client (preferred - ensures correct city from URL)
      cityId = body.city_id
      console.log('Using city_id from client:', cityId)
    } else {
      // Fallback: Extract city_id from the first item's equipment (legacy support)
      console.log('Request items:', body.items)
      console.log('Looking for equipment_id:', body.items[0].equipment_id)

      const { data: cityEquipment, error: eqError } = await supabaseServer
        .from('city_equipment')
        .select('city_id')
        .eq('global_equipment_id', body.items[0].equipment_id)
        .limit(1)
        .maybeSingle()

      console.log('City equipment result:', cityEquipment, 'Error:', eqError)

      if (eqError || !cityEquipment) {
        console.error('Equipment not found:', body.items[0].equipment_id, eqError)
        return NextResponse.json(
          { error: 'ציוד לא נמצא' },
          { status: 404 }
        )
      }

      cityId = cityEquipment.city_id
      console.log('Found cityId from equipment:', cityId)
    }

    // Get city settings and manager info
    const { data: city, error: cityError } = await supabaseServer
      .from('cities')
      .select('name, require_call_id, request_mode, max_request_distance_km, token_lat, token_lng, manager1_name, manager1_user_id')
      .eq('id', cityId)
      .single()

    console.log('City query result:', city, 'Error:', cityError)

    if (cityError || !city) {
      console.error('City not found for cityId:', cityId, 'Error:', cityError)
      return NextResponse.json(
        { error: 'עיר לא נמצאה' },
        { status: 404 }
      )
    }

    // Get all city managers' emails
    const { data: cityManagers } = await supabaseServer
      .from('city_managers')
      .select('id, name, email')
      .eq('city_id', cityId)

    // Collect all manager emails (from city_managers table and users table)
    const managerEmails: { email: string; name: string }[] = []

    if (cityManagers && cityManagers.length > 0) {
      for (const manager of cityManagers) {
        // Get email from users table using manager id
        const { data: userData } = await supabaseServer
          .from('users')
          .select('email')
          .eq('id', manager.id)
          .single()

        if (userData?.email) {
          managerEmails.push({ email: userData.email, name: manager.name || 'מנהל' })
        }
      }
    }

    // Fallback to manager1_user_id if no managers found in city_managers
    if (managerEmails.length === 0 && city.manager1_user_id) {
      const { data: manager } = await supabaseServer
        .from('users')
        .select('email')
        .eq('id', city.manager1_user_id)
        .single()
      if (manager?.email) {
        managerEmails.push({ email: manager.email, name: city.manager1_name || 'מנהל' })
      }
    }

    // Validate call_id if required
    // Use strict equality to handle null/undefined/false correctly
    console.log('🔍 require_call_id check:', {
      require_call_id: city.require_call_id,
      type: typeof city.require_call_id,
      strictEquals: city.require_call_id === true,
      body_call_id: body.call_id
    })

    if (city.require_call_id === true && !body.call_id) {
      console.log('❌ Blocking request: require_call_id is TRUE and no call_id provided')
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

    // Check if borrower has overdue equipment (borrowed > 24 hours ago)
    const normalizedPhone = body.requester_phone.replace(/\D/g, '')
    const overdueThreshold = new Date()
    overdueThreshold.setHours(overdueThreshold.getHours() - 24)

    const { data: overdueItems } = await supabaseServer
      .from('borrow_history')
      .select('id, equipment_name, borrow_date')
      .or(`phone.eq.${normalizedPhone},phone.eq.0${normalizedPhone},phone.eq.${normalizedPhone.replace(/^972/, '0')}`)
      .eq('status', 'borrowed')
      .lt('borrow_date', overdueThreshold.toISOString())
      .limit(5)

    if (overdueItems && overdueItems.length > 0) {
      const itemNames = overdueItems.map(i => i.equipment_name).join(', ')
      return NextResponse.json(
        {
          error: `לא ניתן לבצע השאלה חדשה. יש לך ציוד שטרם הוחזר: ${itemNames}. יש להחזיר את הציוד ולקבל אישור מנהל לפני השאלה חדשה.`,
          overdueItems: overdueItems.map(i => ({
            name: i.equipment_name,
            borrowDate: i.borrow_date
          }))
        },
        { status: 403 }
      )
    }

    // Check distance limit if configured
    const maxDistance = city.max_request_distance_km
    if (maxDistance && maxDistance > 0) {
      // Distance check is enabled for this city
      if (!body.requester_lat || !body.requester_lng) {
        return NextResponse.json(
          { error: 'נדרש אישור מיקום לשליחת בקשה. אנא אשר גישה למיקום ונסה שוב.' },
          { status: 400 }
        )
      }

      if (!city.token_lat || !city.token_lng) {
        // City doesn't have location set, skip distance check
        console.log(`City ${cityId} has distance limit but no token location set, skipping check`)
      } else {
        const distance = calculateDistance(
          body.requester_lat,
          body.requester_lng,
          city.token_lat,
          city.token_lng
        )

        console.log(`Distance check: user at (${body.requester_lat}, ${body.requester_lng}), cabinet at (${city.token_lat}, ${city.token_lng}), distance: ${distance.toFixed(2)}km, max: ${maxDistance}km`)

        if (distance > maxDistance) {
          return NextResponse.json(
            {
              error: `אתה נמצא רחוק מדי מהארון (${distance.toFixed(1)} ק"מ). הטווח המקסימלי לבקשה הוא ${maxDistance} ק"מ.`,
              distance: distance.toFixed(2),
              maxDistance
            },
            { status: 400 }
          )
        }
      }
    }

    // Validate all items - OPTIMIZED: Batch query instead of N+1
    const equipmentIds = body.items.map(item => item.equipment_id)

    // Fetch all equipment from city_equipment (new structure)
    // Note: city_equipment doesn't have equipment_status column, items are always assumed working
    const { data: cityEquipmentList, error: fetchError } = await supabaseServer
      .from('city_equipment')
      .select('id, global_equipment_id, quantity')
      .in('global_equipment_id', equipmentIds)
      .eq('city_id', cityId)

    if (fetchError) {
      console.error('Error fetching city equipment:', fetchError)
      console.error('Query params:', { equipmentIds, cityId })
      return NextResponse.json(
        { error: 'שגיאה בטעינת נתוני ציוד: ' + fetchError.message },
        { status: 500 }
      )
    }

    console.log('Found city equipment:', cityEquipmentList?.length || 0, 'items for', equipmentIds.length, 'requested')

    // Create map for quick lookup - key is global_equipment_id
    const equipmentMap = new Map(cityEquipmentList?.map(eq => [eq.global_equipment_id, {
      id: eq.global_equipment_id,
      quantity: eq.quantity,
      is_consumable: false, // city_equipment doesn't track this, assume non-consumable
      equipment_status: 'working' as const // city_equipment items are always working
    }]) || [])

    // Validate each item
    for (const item of body.items) {
      const eq = equipmentMap.get(item.equipment_id)

      if (!eq) {
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

    // Create request items (using only global_equipment_id)
    const itemsToInsert = body.items.map(item => ({
      request_id: newRequest.id,
      global_equipment_id: item.equipment_id,
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

    // Send email notification to all city managers (fire and forget)
    if (managerEmails.length > 0) {
      try {
        // Get equipment names for the email
        const { data: equipmentNames } = await supabaseServer
          .from('global_equipment_pool')
          .select('id, name')
          .in('id', body.items.map(i => i.equipment_id))

        const itemsWithNames = body.items.map(item => ({
          name: equipmentNames?.find(eq => eq.id === item.equipment_id)?.name || 'ציוד',
          quantity: item.quantity
        }))

        // Send email to each manager
        await Promise.all(
          managerEmails.map(manager =>
            sendNewRequestEmail(
              manager.email,
              manager.name,
              body.requester_name,
              body.requester_phone,
              city.name || 'ארון ציוד',
              itemsWithNames
            ).catch(err => {
              console.error(`Failed to send email to ${manager.email}:`, err)
            })
          )
        )
      } catch (emailError) {
        console.error('Error sending email notifications:', emailError)
        // Continue anyway - email failure shouldn't block request creation
      }
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
