import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hashToken } from '@/lib/token'
import { sendLowStockEmail } from '@/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'חסר טוקן' },
        { status: 400 }
      )
    }

    // Get request by token
    const tokenHash = hashToken(token)
    const { data: equipmentRequest, error: fetchError } = await supabase
      .from('equipment_requests')
      .select(`
        *,
        city:cities(*),
        items:request_items(*)
      `)
      .eq('token_hash', tokenHash)
      .single()

    if (fetchError || !equipmentRequest) {
      return NextResponse.json(
        { error: 'בקשה לא נמצאה' },
        { status: 404 }
      )
    }

    // Check if request is approved
    if (equipmentRequest.status !== 'approved') {
      return NextResponse.json(
        { error: 'ניתן לאשר לקיחה רק לבקשות מאושרות' },
        { status: 400 }
      )
    }

    // Check if already picked up (we'll add a new status later)
    if (equipmentRequest.status === 'picked_up') {
      return NextResponse.json(
        { error: 'הציוד כבר נלקח' },
        { status: 400 }
      )
    }

    // Process each equipment item
    for (const item of equipmentRequest.items) {
      // The equipment_id in request_items is now global_equipment_id
      const globalEquipmentId = item.global_equipment_id || item.equipment_id

      // Get city_equipment for this item
      const { data: cityEquipment, error: ceError } = await supabase
        .from('city_equipment')
        .select(`
          *,
          global_equipment:global_equipment_pool(*)
        `)
        .eq('global_equipment_id', globalEquipmentId)
        .eq('city_id', equipmentRequest.city_id)
        .single()

      if (ceError || !cityEquipment) {
        console.error('City equipment not found:', globalEquipmentId, ceError)
        return NextResponse.json(
          { error: 'ציוד לא נמצא בעיר' },
          { status: 404 }
        )
      }

      // 1. Decrease equipment inventory
      const newQuantity = cityEquipment.quantity - item.quantity

      if (newQuantity < 0) {
        return NextResponse.json(
          { error: `אין מספיק יחידות של ${cityEquipment.global_equipment?.name || 'ציוד'}` },
          { status: 400 }
        )
      }

      const { error: updateError } = await supabase
        .from('city_equipment')
        .update({ quantity: newQuantity })
        .eq('id', cityEquipment.id)

      if (updateError) {
        console.error('Error updating equipment:', updateError)
        return NextResponse.json(
          { error: 'שגיאה בעדכון מלאי' },
          { status: 500 }
        )
      }

      // 2. Create borrow_history record
      console.log('Creating borrow_history with city_id:', equipmentRequest.city_id)

      const currentTime = new Date().toISOString()

      const { error: historyError } = await supabase
        .from('borrow_history')
        .insert({
          name: equipmentRequest.requester_name,
          phone: equipmentRequest.requester_phone,
          equipment_id: globalEquipmentId, // Keep for backwards compatibility
          global_equipment_id: globalEquipmentId, // New field
          equipment_name: cityEquipment.global_equipment?.name || '',
          city_id: equipmentRequest.city_id,
          status: 'borrowed',
          borrow_date: currentTime,
          equipment_status: 'working'
        })

      if (historyError) {
        console.error('Error creating history:', historyError)
        console.error('Failed data:', {
          name: equipmentRequest.requester_name,
          phone: equipmentRequest.requester_phone,
          equipment_id: globalEquipmentId,
          equipment_name: cityEquipment.global_equipment?.name,
          city_id: equipmentRequest.city_id
        })
        return NextResponse.json(
          { error: 'שגיאה ביצירת רשומת היסטוריה: ' + (historyError.message || historyError.toString()) },
          { status: 500 }
        )
      }
    }

    // 3. Update request status to picked_up instead of deleting
    const { error: updateRequestError } = await supabase
      .from('equipment_requests')
      .update({
        status: 'picked_up'
      })
      .eq('id', equipmentRequest.id)

    if (updateRequestError) {
      console.error('Error updating request:', updateRequestError)
      return NextResponse.json(
        { error: 'שגיאה בעדכון הבקשה' },
        { status: 500 }
      )
    }

    // 4. Check for low stock and send email notification
    try {
      const LOW_STOCK_THRESHOLD = 2 // Alert when quantity <= 2

      // Get all city equipment with low stock
      const { data: lowStockItems } = await supabase
        .from('city_equipment')
        .select(`
          quantity,
          global_equipment:global_equipment_pool(name)
        `)
        .eq('city_id', equipmentRequest.city_id)
        .lte('quantity', LOW_STOCK_THRESHOLD)

      if (lowStockItems && lowStockItems.length > 0 && equipmentRequest.city.manager_email) {
        const itemsForEmail = lowStockItems.map(item => ({
          name: (item.global_equipment as any)?.name || 'ציוד',
          quantity: item.quantity,
          minQuantity: LOW_STOCK_THRESHOLD
        }))

        await sendLowStockEmail(
          equipmentRequest.city.manager_email,
          equipmentRequest.city.manager_name || 'מנהל',
          equipmentRequest.city.name || 'ארון ציוד',
          itemsForEmail
        ).catch(err => {
          console.error('Failed to send low stock email:', err)
        })
      }
    } catch (lowStockError) {
      console.error('Error checking low stock:', lowStockError)
      // Continue anyway - low stock check failure shouldn't block pickup
    }

    // Return success with city_id for redirect
    return NextResponse.json({
      success: true,
      message: 'הציוד נלקח בהצלחה',
      city_id: equipmentRequest.city_id
    })

  } catch (error) {
    console.error('Confirm pickup error:', error)
    return NextResponse.json(
      { error: 'שגיאת שרת' },
      { status: 500 }
    )
  }
}
