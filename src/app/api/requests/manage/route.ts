import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { createRequestToken } from '@/lib/token'
import { logActivity, ActivityActions } from '@/lib/activity-logger'

/**
 * PATCH /api/requests/manage
 * Approves, rejects, cancels, or regenerates token for a request
 */
export async function PATCH(request: NextRequest) {
  try {
    const {
      requestId,
      action,
      managerName,
      cityId,
      rejectedReason
    } = await request.json()

    if (!requestId || !action || !managerName || !cityId) {
      return NextResponse.json(
        { error: 'חסרים פרטים נדרשים' },
        { status: 400 }
      )
    }

    // Valid actions
    const validActions = ['approve', 'reject', 'cancel', 'regenerate']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: 'פעולה לא חוקית' },
        { status: 400 }
      )
    }

    // Fetch the request
    const { data: existingRequest, error: fetchError } = await supabaseServer
      .from('equipment_requests')
      .select(`
        *,
        items:request_items(
          *,
          equipment:equipment(*)
        )
      `)
      .eq('id', requestId)
      .eq('city_id', cityId)
      .single()

    if (fetchError || !existingRequest) {
      return NextResponse.json(
        { error: 'בקשה לא נמצאה' },
        { status: 404 }
      )
    }

    let updateData: any = {}
    let newToken: string | null = null
    let activityAction = ''
    let activityDetails: any = {}

    switch (action) {
      case 'approve':
        if (existingRequest.status !== 'pending') {
          return NextResponse.json(
            { error: 'ניתן לאשר רק בקשות ממתינות' },
            { status: 400 }
          )
        }

        // Check equipment availability
        for (const item of existingRequest.items) {
          const equipment = item.equipment
          if (equipment.equipment_status !== 'working') {
            return NextResponse.json(
              { error: `הציוד "${equipment.name}" תקול ואינו זמין` },
              { status: 400 }
            )
          }

          if (!equipment.is_consumable && equipment.quantity < 1) {
            return NextResponse.json(
              { error: `הציוד "${equipment.name}" אינו זמין במלאי` },
              { status: 400 }
            )
          }

          if (equipment.is_consumable && equipment.quantity < item.quantity) {
            return NextResponse.json(
              { error: `אין מספיק כמות מהציוד "${equipment.name}"` },
              { status: 400 }
            )
          }
        }

        updateData = {
          status: 'approved',
          approved_by: managerName,
          approved_at: new Date().toISOString()
        }

        activityAction = ActivityActions.REQUEST_APPROVED
        activityDetails = {
          request_id: requestId,
          requester_name: existingRequest.requester_name,
          requester_phone: existingRequest.requester_phone,
          items_count: existingRequest.items.length
        }
        break

      case 'reject':
        if (existingRequest.status !== 'pending') {
          return NextResponse.json(
            { error: 'ניתן לדחות רק בקשות ממתינות' },
            { status: 400 }
          )
        }

        updateData = {
          status: 'rejected',
          rejected_reason: rejectedReason || null
        }

        activityAction = ActivityActions.REQUEST_REJECTED
        activityDetails = {
          request_id: requestId,
          requester_name: existingRequest.requester_name,
          reason: rejectedReason
        }
        break

      case 'cancel':
        if (!['pending', 'approved'].includes(existingRequest.status)) {
          return NextResponse.json(
            { error: 'לא ניתן לבטל בקשה זו' },
            { status: 400 }
          )
        }

        updateData = { status: 'cancelled' }

        activityAction = ActivityActions.REQUEST_CANCELLED
        activityDetails = {
          request_id: requestId,
          requester_name: existingRequest.requester_name,
          previous_status: existingRequest.status
        }
        break

      case 'regenerate':
        if (existingRequest.status !== 'expired' && existingRequest.status !== 'approved') {
          return NextResponse.json(
            { error: 'ניתן לייצר טוקן חדש רק לבקשות שפג תוקפן או מאושרות' },
            { status: 400 }
          )
        }

        const { token, tokenHash, expiresAt } = createRequestToken()
        newToken = token

        updateData = {
          token_hash: tokenHash,
          expires_at: expiresAt,
          status: existingRequest.status === 'expired' ? 'pending' : 'approved'
        }

        activityAction = ActivityActions.TOKEN_REGENERATED
        activityDetails = {
          request_id: requestId,
          requester_name: existingRequest.requester_name,
          previous_status: existingRequest.status
        }
        break
    }

    // Update request
    const { error: updateError } = await supabaseServer
      .from('equipment_requests')
      .update(updateData)
      .eq('id', requestId)

    if (updateError) {
      console.error('Error updating request:', updateError)
      return NextResponse.json(
        { error: 'שגיאה בעדכון בקשה' },
        { status: 500 }
      )
    }

    // Log activity
    await logActivity({
      cityId,
      managerName,
      action: activityAction,
      details: activityDetails,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    })

    console.log('Request managed:', {
      request_id: requestId,
      action,
      manager: managerName
    })

    return NextResponse.json({
      success: true,
      newToken: newToken || undefined
    })
  } catch (error) {
    console.error('Manage request error:', error)
    return NextResponse.json(
      { error: 'שגיאה בניהול בקשה' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/requests/manage?cityId=xxx
 * Gets all requests for a city
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cityId = searchParams.get('cityId')

    if (!cityId) {
      return NextResponse.json(
        { error: 'חסר מזהה עיר' },
        { status: 400 }
      )
    }

    const { data: requests, error } = await supabaseServer
      .from('equipment_requests')
      .select(`
        *,
        items:request_items(
          *,
          equipment:equipment(*)
        )
      `)
      .eq('city_id', cityId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching requests:', error)
      return NextResponse.json(
        { error: 'שגיאה בטעינת בקשות' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      requests: requests || []
    })
  } catch (error) {
    console.error('Fetch requests error:', error)
    return NextResponse.json(
      { error: 'שגיאה בתהליך טעינת בקשות' },
      { status: 500 }
    )
  }
}
