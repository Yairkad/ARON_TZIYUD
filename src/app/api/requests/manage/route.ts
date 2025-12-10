import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { createRequestToken } from '@/lib/token'
import { logActivity, ActivityActions } from '@/lib/activity-logger'
import { requireApprovePermission } from '@/lib/auth-middleware'
import { sendLowStockEmail } from '@/lib/email'

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

    // Check permissions - require approve permission for the city
    const { user, error: authError } = await requireApprovePermission(request, cityId)
    if (authError) {
      return authError
    }

    // Valid actions
    const validActions = ['approve', 'reject', 'cancel', 'regenerate', 'undo_pickup']
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
          equipment:global_equipment_pool!request_items_global_equipment_id_fkey(*)
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

        // Check equipment availability from city_equipment table
        // Note: global_equipment_pool doesn't have equipment_status/quantity - those are in city_equipment
        const globalEquipmentIds = existingRequest.items.map((item: any) => item.global_equipment_id)

        const { data: cityEquipmentList, error: cityEqError } = await supabaseServer
          .from('city_equipment')
          .select('global_equipment_id, quantity, equipment_status, is_consumable')
          .eq('city_id', cityId)
          .in('global_equipment_id', globalEquipmentIds)

        if (cityEqError) {
          console.error('Error fetching city equipment:', cityEqError)
          return NextResponse.json(
            { error: 'שגיאה בבדיקת זמינות ציוד' },
            { status: 500 }
          )
        }

        // Create map for quick lookup
        const cityEquipmentMap = new Map(
          cityEquipmentList?.map(eq => [eq.global_equipment_id, eq]) || []
        )

        for (const item of existingRequest.items) {
          const globalEquipment = item.equipment // From global_equipment_pool (has name)
          const cityEquipment = cityEquipmentMap.get(item.global_equipment_id)

          if (!cityEquipment) {
            return NextResponse.json(
              { error: `הציוד "${globalEquipment?.name || 'לא ידוע'}" לא נמצא בארון זה` },
              { status: 404 }
            )
          }

          // Check equipment status (default to 'working' if not set)
          const status = cityEquipment.equipment_status || 'working'
          if (status !== 'working') {
            return NextResponse.json(
              { error: `הציוד "${globalEquipment?.name || 'לא ידוע'}" תקול ואינו זמין` },
              { status: 400 }
            )
          }

          const isConsumable = cityEquipment.is_consumable || false
          const quantity = cityEquipment.quantity || 0

          if (!isConsumable && quantity < 1) {
            return NextResponse.json(
              { error: `הציוד "${globalEquipment?.name || 'לא ידוע'}" אינו זמין במלאי` },
              { status: 400 }
            )
          }

          if (isConsumable && quantity < item.quantity) {
            return NextResponse.json(
              { error: `אין מספיק כמות מהציוד "${globalEquipment?.name || 'לא ידוע'}"` },
              { status: 400 }
            )
          }
        }

        // Update inventory and create borrow records immediately on approval
        const currentTime = new Date().toISOString()

        for (const item of existingRequest.items) {
          const globalEquipment = item.equipment
          const cityEquipment = cityEquipmentMap.get(item.global_equipment_id)

          if (!cityEquipment) continue

          // 1. Decrease equipment inventory
          const newQuantity = cityEquipment.quantity - item.quantity

          const { error: updateInvError } = await supabaseServer
            .from('city_equipment')
            .update({ quantity: newQuantity })
            .eq('city_id', cityId)
            .eq('global_equipment_id', item.global_equipment_id)

          if (updateInvError) {
            console.error('Error updating inventory:', updateInvError)
            return NextResponse.json(
              { error: 'שגיאה בעדכון מלאי' },
              { status: 500 }
            )
          }

          // 2. Create borrow_history record (only for non-consumable items)
          if (!cityEquipment.is_consumable) {
            const { error: historyError } = await supabaseServer
              .from('borrow_history')
              .insert({
                name: existingRequest.requester_name,
                phone: existingRequest.requester_phone,
                equipment_id: item.global_equipment_id,
                global_equipment_id: item.global_equipment_id,
                equipment_name: globalEquipment?.name || '',
                city_id: cityId,
                status: 'borrowed',
                borrow_date: currentTime,
                equipment_status: 'working'
              })

            if (historyError) {
              console.error('Error creating borrow history:', historyError)
              return NextResponse.json(
                { error: 'שגיאה ביצירת רשומת השאלה' },
                { status: 500 }
              )
            }
          }
        }

        // Set status to picked_up (borrowed) immediately
        updateData = {
          status: 'picked_up',
          approved_by: managerName,
          approved_at: currentTime
        }

        activityAction = ActivityActions.REQUEST_APPROVED
        activityDetails = {
          request_id: requestId,
          requester_name: existingRequest.requester_name,
          requester_phone: existingRequest.requester_phone,
          items_count: existingRequest.items.length
        }

        // Check for low stock and send email notification (fire and forget)
        try {
          const LOW_STOCK_THRESHOLD = 2

          const { data: cityData } = await supabaseServer
            .from('cities')
            .select('manager_email, manager1_name, name')
            .eq('id', cityId)
            .single()

          const { data: lowStockItems } = await supabaseServer
            .from('city_equipment')
            .select(`
              quantity,
              global_equipment:global_equipment_pool(name)
            `)
            .eq('city_id', cityId)
            .lte('quantity', LOW_STOCK_THRESHOLD)

          if (lowStockItems && lowStockItems.length > 0 && cityData?.manager_email) {
            const itemsForEmail = lowStockItems.map(item => ({
              name: (item.global_equipment as any)?.name || 'ציוד',
              quantity: item.quantity,
              minQuantity: LOW_STOCK_THRESHOLD
            }))

            await sendLowStockEmail(
              cityData.manager_email,
              cityData.manager1_name || 'מנהל',
              cityData.name || 'ארון ציוד',
              itemsForEmail
            ).catch(err => {
              console.error('Failed to send low stock email:', err)
            })
          }
        } catch (lowStockError) {
          console.error('Error checking low stock:', lowStockError)
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
          token: token,  // Store original token for sharing
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

      case 'undo_pickup':
        // Undo a pickup - restore inventory and delete borrow records
        if (existingRequest.status !== 'picked_up') {
          return NextResponse.json(
            { error: 'ניתן לבטל איסוף רק לבקשות שנאספו' },
            { status: 400 }
          )
        }

        // Restore inventory for each item
        for (const item of existingRequest.items) {
          const globalEquipmentId = item.global_equipment_id

          // Get current city equipment
          const { data: cityEquipment } = await supabaseServer
            .from('city_equipment')
            .select('quantity, is_consumable')
            .eq('city_id', cityId)
            .eq('global_equipment_id', globalEquipmentId)
            .single()

          if (cityEquipment) {
            // Restore quantity
            const { error: restoreError } = await supabaseServer
              .from('city_equipment')
              .update({ quantity: cityEquipment.quantity + item.quantity })
              .eq('city_id', cityId)
              .eq('global_equipment_id', globalEquipmentId)

            if (restoreError) {
              console.error('Error restoring inventory:', restoreError)
              return NextResponse.json(
                { error: 'שגיאה בהחזרת מלאי' },
                { status: 500 }
              )
            }

            // Delete borrow_history record (for non-consumables)
            if (!cityEquipment.is_consumable) {
              const { error: deleteHistoryError } = await supabaseServer
                .from('borrow_history')
                .delete()
                .eq('city_id', cityId)
                .eq('global_equipment_id', globalEquipmentId)
                .eq('phone', existingRequest.requester_phone)
                .eq('status', 'borrowed')

              if (deleteHistoryError) {
                console.error('Error deleting borrow history:', deleteHistoryError)
                // Continue anyway - inventory was restored
              }
            }
          }
        }

        // Update request status to cancelled
        updateData = { status: 'cancelled' }

        activityAction = ActivityActions.REQUEST_CANCELLED
        activityDetails = {
          request_id: requestId,
          requester_name: existingRequest.requester_name,
          previous_status: 'picked_up',
          reason: 'לא נאסף בפועל - המלאי הוחזר'
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

    // Send WhatsApp notification to requester (fire and forget)
    if (existingRequest.requester_phone && (action === 'approve' || action === 'reject')) {
      try {
        const { sendRequestStatusWhatsApp } = await import('@/lib/whatsapp')
        const equipmentNames = existingRequest.items
          .map((item: any) => item.equipment?.name || 'ציוד')
          .join(', ')

        await sendRequestStatusWhatsApp(
          existingRequest.requester_phone,
          existingRequest.requester_name,
          action === 'approve' ? 'approved' : 'rejected',
          equipmentNames,
          action === 'reject' ? rejectedReason : undefined
        )
      } catch (whatsappError) {
        console.error('Error sending WhatsApp to requester:', whatsappError)
        // Continue anyway - WhatsApp failure shouldn't block the action
      }
    }

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
          equipment:global_equipment_pool!request_items_global_equipment_id_fkey(*)
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
