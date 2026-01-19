import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * API endpoint להחזרת ציוד על ידי מתנדב
 * משתמש ב-service role key כדי לעקוף RLS
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { borrowId, equipmentStatus, faultyNotes } = body

    if (!borrowId) {
      return NextResponse.json(
        { error: 'חסר מזהה השאלה' },
        { status: 400 }
      )
    }

    // בדיקה שהציוד קיים ובסטטוס 'borrowed'
    const { data: borrowRecord, error: fetchError } = await supabase
      .from('borrow_history')
      .select('id, status, city_id, equipment_name')
      .eq('id', borrowId)
      .single()

    if (fetchError || !borrowRecord) {
      console.error('Error fetching borrow record:', fetchError)
      return NextResponse.json(
        { error: 'רשומת ההשאלה לא נמצאה' },
        { status: 404 }
      )
    }

    if (borrowRecord.status !== 'borrowed') {
      return NextResponse.json(
        { error: 'הציוד כבר הוחזר או ממתין לאישור' },
        { status: 400 }
      )
    }

    // עדכון הרשומה לסטטוס pending_approval
    const updateData: {
      status: string
      return_date: string
      equipment_status: string
      faulty_notes?: string
    } = {
      status: 'pending_approval',
      return_date: new Date().toISOString(),
      equipment_status: equipmentStatus || 'working'
    }

    // הוספת הערות אם הציוד תקול
    if (equipmentStatus === 'faulty' && faultyNotes) {
      updateData.faulty_notes = faultyNotes.trim()
    }

    const { error: updateError } = await supabase
      .from('borrow_history')
      .update(updateData)
      .eq('id', borrowId)

    if (updateError) {
      console.error('Error updating borrow record:', updateError)
      return NextResponse.json(
        { error: 'שגיאה בעדכון רשומת ההחזרה' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'הציוד סומן כממתין לאישור',
      cityId: borrowRecord.city_id,
      equipmentName: borrowRecord.equipment_name
    })

  } catch (error) {
    console.error('Return equipment error:', error)
    return NextResponse.json(
      { error: 'שגיאת שרת' },
      { status: 500 }
    )
  }
}
