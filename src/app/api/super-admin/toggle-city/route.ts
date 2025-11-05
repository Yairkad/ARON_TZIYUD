import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { cityId, is_active } = await request.json()

    console.log('Toggle city request:', { cityId, is_active })

    if (!cityId || is_active === undefined) {
      return NextResponse.json(
        { error: 'נדרש מזהה עיר וסטטוס' },
        { status: 400 }
      )
    }

    // First, verify the city exists
    const { data: existingCity, error: fetchError } = await supabaseServer
      .from('cities')
      .select('*')
      .eq('id', cityId)
      .single()

    if (fetchError || !existingCity) {
      console.error('City not found:', fetchError)
      return NextResponse.json(
        { error: 'העיר לא נמצאה' },
        { status: 404 }
      )
    }

    console.log('Existing city before update:', existingCity)

    // Update the city
    const { data: updatedCity, error } = await supabaseServer
      .from('cities')
      .update({ is_active })
      .eq('id', cityId)
      .select()
      .single()

    if (error) {
      console.error('Error toggling city:', error)
      return NextResponse.json(
        { error: 'שגיאה בשינוי סטטוס העיר' },
        { status: 500 }
      )
    }

    console.log('City after update:', updatedCity)

    return NextResponse.json({
      success: true,
      message: 'הסטטוס עודכן בהצלחה',
      city: updatedCity
    })
  } catch (error) {
    console.error('Toggle city error:', error)
    return NextResponse.json(
      { error: 'שגיאה בתהליך שינוי הסטטוס' },
      { status: 500 }
    )
  }
}
