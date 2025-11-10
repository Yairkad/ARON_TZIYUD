import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { requestId, minutesToAdd, managerName } = await request.json()

    if (!requestId || !minutesToAdd || !managerName) {
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
        { error: 'לא ניתן להאריך טוקן שאינו מאושר' },
        { status: 400 }
      )
    }

    // חישוב זמן תוקף חדש
    const currentExpiry = new Date(existingRequest.expires_at)
    const newExpiry = new Date(currentExpiry.getTime() + minutesToAdd * 60 * 1000)

    // עדכון תוקף הטוקן
    const { error: updateError } = await supabaseServer
      .from('equipment_requests')
      .update({
        expires_at: newExpiry.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (updateError) {
      console.error('Error extending token:', updateError)
      return NextResponse.json(
        { error: 'שגיאה בהארכת תוקף' },
        { status: 500 }
      )
    }

    // רישום הפעולה בלוג
    await supabaseServer
      .from('activity_log')
      .insert({
        city_id: existingRequest.city_id,
        manager_name: managerName,
        action: 'extend_token',
        details: {
          request_id: requestId,
          requester_name: existingRequest.requester_name,
          minutes_added: minutesToAdd,
          new_expiry: newExpiry.toISOString()
        }
      })

    return NextResponse.json({
      success: true,
      message: `תוקף הטוקן הוארך ב-${minutesToAdd} דקות`,
      newExpiry: newExpiry.toISOString()
    })
  } catch (error) {
    console.error('Extend token error:', error)
    return NextResponse.json(
      { error: 'שגיאה בהארכת תוקף הטוקן' },
      { status: 500 }
    )
  }
}
