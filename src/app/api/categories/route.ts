import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables')
      return NextResponse.json(
        { success: false, error: 'שגיאת הגדרות שרת' },
        { status: 500 }
      )
    }

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

    // Cache categories for 5 minutes - they rarely change
    return NextResponse.json(
      {
        success: true,
        categories: categories || []
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      }
    )
  } catch (error) {
    console.error('Error in categories API:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאת שרת' },
      { status: 500 }
    )
  }
}

// POST - Add new category
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'שגיאת הגדרות שרת' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()
    const { name, image_url, display_order } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'שם הקטגוריה חובה' },
        { status: 400 }
      )
    }

    // Check if category with same name exists
    const { data: existing } = await supabase
      .from('equipment_categories')
      .select('id')
      .eq('name', name)
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'קטגוריה עם שם זה כבר קיימת' },
        { status: 409 }
      )
    }

    // Get max display_order if not provided
    let order = display_order
    if (!order) {
      const { data: maxOrder } = await supabase
        .from('equipment_categories')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1)
        .single()

      order = (maxOrder?.display_order || 0) + 1
    }

    const { data, error } = await supabase
      .from('equipment_categories')
      .insert([{
        name,
        image_url: image_url || null,
        display_order: order
      }])
      .select()
      .single()

    if (error) {
      console.error('Error adding category:', error)
      return NextResponse.json(
        { success: false, error: 'שגיאה בהוספת הקטגוריה' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'הקטגוריה נוספה בהצלחה',
      category: data
    })
  } catch (error) {
    console.error('Error in categories POST:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאת שרת' },
      { status: 500 }
    )
  }
}

// PUT - Update category
export async function PUT(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'שגיאת הגדרות שרת' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()
    const { id, name, image_url, display_order } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'מזהה קטגוריה חובה' },
        { status: 400 }
      )
    }

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'שם הקטגוריה חובה' },
        { status: 400 }
      )
    }

    // Check if another category with same name exists
    const { data: existing } = await supabase
      .from('equipment_categories')
      .select('id')
      .eq('name', name)
      .neq('id', id)
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'קטגוריה עם שם זה כבר קיימת' },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('equipment_categories')
      .update({
        name,
        image_url: image_url || null,
        display_order: display_order || null
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating category:', error)
      return NextResponse.json(
        { success: false, error: 'שגיאה בעדכון הקטגוריה' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'הקטגוריה עודכנה בהצלחה',
      category: data
    })
  } catch (error) {
    console.error('Error in categories PUT:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאת שרת' },
      { status: 500 }
    )
  }
}

// DELETE - Delete category
export async function DELETE(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'שגיאת הגדרות שרת' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'מזהה קטגוריה חובה' },
        { status: 400 }
      )
    }

    // Check if category has equipment
    const { data: equipmentCount } = await supabase
      .from('global_equipment_pool')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)

    if (equipmentCount && (equipmentCount as any).length > 0) {
      return NextResponse.json(
        { success: false, error: 'לא ניתן למחוק קטגוריה שיש בה פריטים. העבר את הפריטים לקטגוריה אחרת תחילה.' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('equipment_categories')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting category:', error)
      return NextResponse.json(
        { success: false, error: 'שגיאה במחיקת הקטגוריה' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'הקטגוריה נמחקה בהצלחה'
    })
  } catch (error) {
    console.error('Error in categories DELETE:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאת שרת' },
      { status: 500 }
    )
  }
}
