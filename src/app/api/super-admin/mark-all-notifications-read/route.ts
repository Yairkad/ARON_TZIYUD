import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { error } = await supabaseServer
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('is_read', false)

    if (error) {
      console.error('Error marking all notifications as read:', error)
      return NextResponse.json(
        { error: 'שגיאה בסימון כל ההתראות כנקראות' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'כל ההתראות סומנו כנקראות'
    })
  } catch (error) {
    console.error('Mark all notifications read error:', error)
    return NextResponse.json(
      { error: 'שגיאה בתהליך סימון ההתראות' },
      { status: 500 }
    )
  }
}
