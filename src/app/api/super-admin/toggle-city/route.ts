import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { cityId, is_active } = await request.json()

    if (!cityId || is_active === undefined) {
      return NextResponse.json(
        { error: 'נדרש מזהה עיר וסטטוס' },
        { status: 400 }
      )
    }

    const { error } = await supabaseServer
      .from('cities')
      .update({ is_active })
      .eq('id', cityId)

    if (error) {
      console.error('Error toggling city:', error)
      return NextResponse.json(
        { error: 'שגיאה בשינוי סטטוס העיר' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'הסטטוס עודכן בהצלחה'
    })
  } catch (error) {
    console.error('Toggle city error:', error)
    return NextResponse.json(
      { error: 'שגיאה בתהליך שינוי הסטטוס' },
      { status: 500 }
    )
  }
}
