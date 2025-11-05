import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { notificationId } = await request.json()

    if (!notificationId) {
      return NextResponse.json(
        { error: 'נדרש מזהה התראה' },
        { status: 400 }
      )
    }

    const { error } = await supabaseServer
      .from('admin_notifications')
      .delete()
      .eq('id', notificationId)

    if (error) {
      console.error('Error deleting notification:', error)
      return NextResponse.json(
        { error: 'שגיאה במחיקת ההתראה' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'ההתראה נמחקה בהצלחה'
    })
  } catch (error) {
    console.error('Delete notification error:', error)
    return NextResponse.json(
      { error: 'שגיאה בתהליך מחיקת ההתראה' },
      { status: 500 }
    )
  }
}
