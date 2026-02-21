import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface BorrowItem {
  equipment_id: string       // global_equipment_pool id
  city_equipment_id: string  // city_equipment id (for quantity update)
  equipment_name: string
  quantity: number
  is_consumable: boolean
}

/**
 * POST /api/direct-borrow
 * Public endpoint for direct (no-approval) borrow flow.
 * Uses service role to bypass RLS for both borrow_history INSERT and city_equipment UPDATE.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, city_id, items } = body as {
      name: string
      phone: string
      city_id: string
      items: BorrowItem[]
    }

    if (!name || !phone || !city_id || !items?.length) {
      return NextResponse.json({ error: 'חסרים שדות חובה' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const results: { success: boolean; name: string; error?: string }[] = []

    for (const item of items) {
      // Verify equipment still has stock
      const { data: cityEquipment, error: fetchError } = await supabase
        .from('city_equipment')
        .select('quantity')
        .eq('id', item.city_equipment_id)
        .single()

      if (fetchError || !cityEquipment) {
        results.push({ success: false, name: item.equipment_name, error: 'ציוד לא נמצא' })
        continue
      }

      if (!item.is_consumable && cityEquipment.quantity < 1) {
        results.push({ success: false, name: item.equipment_name, error: 'אין מלאי זמין' })
        continue
      }

      if (item.is_consumable && cityEquipment.quantity < item.quantity) {
        results.push({ success: false, name: item.equipment_name, error: 'כמות מבוקשת חורגת מהמלאי' })
        continue
      }

      const isConsumable = item.is_consumable
      const borrowStatus = isConsumable ? 'returned' : 'borrowed'
      const returnDate = isConsumable ? new Date().toISOString() : null

      // 1. Create borrow_history record
      const { error: borrowError } = await supabase
        .from('borrow_history')
        .insert({
          name,
          phone,
          equipment_id: item.equipment_id,
          global_equipment_id: item.equipment_id,
          equipment_name: item.equipment_name,
          city_id,
          status: borrowStatus,
          return_date: returnDate,
          quantity: item.quantity,
        })

      if (borrowError) {
        console.error('Error creating borrow record:', borrowError)
        results.push({ success: false, name: item.equipment_name, error: 'שגיאה ביצירת רשומה' })
        continue
      }

      // 2. Decrement city_equipment quantity
      const { error: updateError } = await supabase
        .from('city_equipment')
        .update({ quantity: cityEquipment.quantity - item.quantity })
        .eq('id', item.city_equipment_id)

      if (updateError) {
        console.error('Error updating quantity:', updateError)
        // Borrow record exists but quantity not updated — log and continue
        results.push({ success: true, name: item.equipment_name, error: 'רשומה נוצרה אך הכמות לא עודכנה' })
        continue
      }

      results.push({ success: true, name: item.equipment_name })
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return NextResponse.json({ results, successCount, failCount })

  } catch (error) {
    console.error('Direct borrow error:', error)
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
}
