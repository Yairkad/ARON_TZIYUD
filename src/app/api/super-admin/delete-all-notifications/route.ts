import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { error } = await supabaseServer
      .from('admin_notifications')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all rows

    if (error) {
      console.error('Error deleting all notifications:', error)
      return NextResponse.json(
        { error: 'שגיאה במחיקת ההתראות' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'כל ההתראות נמחקו בהצלחה'
    })
  } catch (error) {
    console.error('Delete all notifications error:', error)
    return NextResponse.json(
      { error: 'שגיאה בתהליך מחיקת ההתראות' },
      { status: 500 }
    )
  }
}
