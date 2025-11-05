import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabaseServer
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json(
        { error: 'שגיאה בטעינת התראות' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      notifications: data || []
    })
  } catch (error) {
    console.error('Fetch notifications error:', error)
    return NextResponse.json(
      { error: 'שגיאה בתהליך טעינת התראות' },
      { status: 500 }
    )
  }
}
