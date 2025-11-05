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
      .update({ is_read: true })
      .eq('id', notificationId)

    if (error) {
      console.error('Error marking notification as read:', error)
      return NextResponse.json(
        { error: 'שגיאה בסימון ההתראה כנקראה' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'ההתראה סומנה כנקראה'
    })
  } catch (error) {
    console.error('Mark notification read error:', error)
    return NextResponse.json(
      { error: 'שגיאה בתהליך סימון ההתראה' },
      { status: 500 }
    )
  }
}
