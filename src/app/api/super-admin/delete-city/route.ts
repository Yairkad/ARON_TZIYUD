import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { cityId } = await request.json()

    if (!cityId) {
      return NextResponse.json(
        { error: 'נדרש מזהה עיר' },
        { status: 400 }
      )
    }

    const { error } = await supabaseServer
      .from('cities')
      .delete()
      .eq('id', cityId)

    if (error) {
      console.error('Error deleting city:', error)
      return NextResponse.json(
        { error: 'שגיאה במחיקת העיר' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'העיר נמחקה בהצלחה'
    })
  } catch (error) {
    console.error('Delete city error:', error)
    return NextResponse.json(
      { error: 'שגיאה בתהליך מחיקת העיר' },
      { status: 500 }
    )
  }
}
