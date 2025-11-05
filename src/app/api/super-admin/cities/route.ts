import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabaseServer
      .from('cities')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching cities:', error)
      return NextResponse.json(
        { error: 'שגיאה בטעינת ערים' },
        { status: 500 }
      )
    }

    console.log('Cities fetched:', {
      total: data?.length,
      active: data?.filter(c => c.is_active).length,
      inactive: data?.filter(c => !c.is_active).length
    })

    return NextResponse.json({
      success: true,
      cities: data || []
    })
  } catch (error) {
    console.error('Fetch cities error:', error)
    return NextResponse.json(
      { error: 'שגיאה בתהליך טעינת ערים' },
      { status: 500 }
    )
  }
}
