import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// POST - Bulk assign equipment to category
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()
    const { equipment_ids, category_id } = body

    if (!equipment_ids || !Array.isArray(equipment_ids) || equipment_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'יש לבחור לפחות פריט אחד' },
        { status: 400 }
      )
    }

    // category_id can be null to remove from category
    const updateValue = category_id || null

    // Update all selected equipment items
    const { data, error } = await supabase
      .from('global_equipment_pool')
      .update({ category_id: updateValue })
      .in('id', equipment_ids)
      .select()

    if (error) {
      console.error('Error bulk assigning category:', error)
      return NextResponse.json(
        { success: false, error: 'שגיאה בשיוך הפריטים לקטגוריה' },
        { status: 500 }
      )
    }

    const message = category_id
      ? `${data?.length || 0} פריטים שויכו לקטגוריה בהצלחה`
      : `${data?.length || 0} פריטים הוסרו מהקטגוריה בהצלחה`

    return NextResponse.json({
      success: true,
      message,
      updatedCount: data?.length || 0
    })
  } catch (error) {
    console.error('Error in bulk assign:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאת שרת' },
      { status: 500 }
    )
  }
}
