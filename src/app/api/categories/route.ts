import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch all categories ordered by display_order
    const { data: categories, error } = await supabase
      .from('equipment_categories')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
      return NextResponse.json(
        { success: false, error: 'שגיאה בטעינת הקטגוריות' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      categories: categories || []
    })
  } catch (error) {
    console.error('Error in categories API:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאת שרת' },
      { status: 500 }
    )
  }
}
