import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hashToken } from '@/lib/token'

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
        items:request_items(
          *,
          equipment:equipment(*)
        )
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
      // 1. Decrease equipment inventory
      const newQuantity = item.equipment.quantity - item.quantity

      if (newQuantity < 0) {
        return NextResponse.json(
          { error: `אין מספיק יחידות של ${item.equipment.name}` },
          { status: 400 }
        )
      }

      const { error: updateError } = await supabase
        .from('equipment')
        .update({ quantity: newQuantity })
        .eq('id', item.equipment_id)

      if (updateError) {
        console.error('Error updating equipment:', updateError)
        return NextResponse.json(
          { error: 'שגיאה בעדכון מלאי' },
          { status: 500 }
        )
      }

      // 2. Create borrow_history record
      const { error: historyError } = await supabase
        .from('borrow_history')
        .insert({
          name: equipmentRequest.requester_name,
          phone: equipmentRequest.requester_phone,
          equipment_id: item.equipment_id,
          equipment_name: item.equipment.name,
          status: 'borrowed',
          borrow_date: new Date().toISOString()
        })

      if (historyError) {
        console.error('Error creating history:', historyError)
        return NextResponse.json(
          { error: 'שגיאה ביצירת רשומת היסטוריה' },
          { status: 500 }
        )
      }
    }

    // 3. Update request status to picked_up (we need to add this status to the schema)
    // For now, we'll use a custom field or keep it as approved with a picked_up_at timestamp
    const { error: updateRequestError } = await supabase
      .from('equipment_requests')
      .update({
        status: 'approved', // Keep as approved for now
        updated_at: new Date().toISOString()
      })
      .eq('id', equipmentRequest.id)

    if (updateRequestError) {
      console.error('Error updating request:', updateRequestError)
      return NextResponse.json(
        { error: 'שגיאה בעדכון בקשה' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'הציוד נלקח בהצלחה'
    })

  } catch (error) {
    console.error('Confirm pickup error:', error)
    return NextResponse.json(
      { error: 'שגיאת שרת' },
      { status: 500 }
    )
  }
}
