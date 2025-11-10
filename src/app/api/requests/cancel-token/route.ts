import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { requestId, managerName, reason } = await request.json()

    if (!requestId || !managerName) {
      return NextResponse.json(
        { error: 'חסרים פרטים' },
        { status: 400 }
      )
    }

    // שליפת הבקשה הנוכחית
    const { data: existingRequest, error: fetchError } = await supabaseServer
      .from('equipment_requests')
      .select('*, city:cities(*)')
      .eq('id', requestId)
      .single()

    if (fetchError || !existingRequest) {
      return NextResponse.json(
        { error: 'בקשה לא נמצאה' },
        { status: 404 }
      )
    }

    // בדיקה שהבקשה מאושרת
    if (existingRequest.status !== 'approved') {
      return NextResponse.json(
        { error: 'לא ניתן לבטל טוקן שאינו מאושר' },
        { status: 400 }
      )
    }

    // ביטול הטוקן - שינוי סטטוס ל-cancelled
    const { error: updateError } = await supabaseServer
      .from('equipment_requests')
      .update({
        status: 'cancelled',
        rejected_reason: reason || 'הטוקן בוטל על ידי המנהל',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (updateError) {
      console.error('Error cancelling token:', updateError)
      return NextResponse.json(
        { error: 'שגיאה בביטול הטוכן' },
        { status: 500 }
      )
    }

    // רישום הפעולה בלוג
    await supabaseServer
      .from('activity_log')
      .insert({
        city_id: existingRequest.city_id,
        manager_name: managerName,
        action: 'cancel_token',
        details: {
          request_id: requestId,
          requester_name: existingRequest.requester_name,
          reason: reason || 'לא צוין'
        }
      })

    return NextResponse.json({
      success: true,
      message: 'הטוכן בוטל בהצלחה'
    })
  } catch (error) {
    console.error('Cancel token error:', error)
    return NextResponse.json(
      { error: 'שגיאה בביטול הטוכן' },
      { status: 500 }
    )
  }
}
