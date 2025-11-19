import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// GET - Fetch equipment for a specific city
export async function GET(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { searchParams } = new URL(request.url)
    const cityId = searchParams.get('cityId')

    if (!cityId) {
      return NextResponse.json({ error: 'מזהה עיר חובה' }, { status: 400 })
    }

    // Fetch city equipment with global equipment details and categories
    const { data: cityEquipment, error } = await supabase
      .from('city_equipment')
      .select(`
        *,
        global_equipment:global_equipment_pool!inner(
          *,
          category:equipment_categories(*)
        )
      `)
      .eq('city_id', cityId)
      .order('display_order', { ascending: true, nullsFirst: false })

    if (error) {
      console.error('Error fetching city equipment:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ equipment: cityEquipment })
  } catch (error) {
    console.error('Error in city equipment GET:', error)
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
}

// POST - Add equipment from global pool to city
export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const body = await request.json()
    const { city_id, global_equipment_id, quantity = 0, display_order } = body

    if (!city_id || !global_equipment_id) {
      return NextResponse.json({ error: 'חסרים פרמטרים' }, { status: 400 })
    }

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    // Check permissions
    const { data: userData } = await supabase
      .from('users')
      .select('role, city_id, permissions')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 })
    }

    // Verify user can manage this city
    if (userData.role !== 'super_admin' && userData.city_id !== city_id) {
      return NextResponse.json({ error: 'אין הרשאה לנהל עיר זו' }, { status: 403 })
    }

    if (userData.role === 'city_manager' && userData.permissions !== 'full_access') {
      return NextResponse.json({ error: 'נדרשת הרשאת עריכה מלאה' }, { status: 403 })
    }

    // Verify global equipment exists and is active
    const { data: globalEquipment } = await supabase
      .from('global_equipment_pool')
      .select('id, name, status')
      .eq('id', global_equipment_id)
      .single()

    if (!globalEquipment) {
      return NextResponse.json({ error: 'פריט לא נמצא במאגר' }, { status: 404 })
    }

    if (globalEquipment.status !== 'active') {
      return NextResponse.json({ error: 'פריט זה לא פעיל במאגר' }, { status: 400 })
    }

    // Insert city equipment link
    const { data: newLink, error } = await supabase
      .from('city_equipment')
      .insert({
        city_id,
        global_equipment_id,
        quantity,
        display_order
      })
      .select(`
        *,
        global_equipment:global_equipment_pool(
          *,
          category:equipment_categories(*)
        )
      `)
      .single()

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'פריט זה כבר קיים בעיר' }, { status: 400 })
      }
      console.error('Error adding equipment to city:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ equipment: newLink })
  } catch (error) {
    console.error('Error in city equipment POST:', error)
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
}

// PUT - Update city equipment (quantity, display_order)
export async function PUT(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const body = await request.json()
    const { id, quantity, display_order } = body

    if (!id) {
      return NextResponse.json({ error: 'מזהה ציוד חובה' }, { status: 400 })
    }

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    // Get current equipment to verify city
    const { data: currentEquipment } = await supabase
      .from('city_equipment')
      .select('city_id')
      .eq('id', id)
      .single()

    if (!currentEquipment) {
      return NextResponse.json({ error: 'ציוד לא נמצא' }, { status: 404 })
    }

    // Check permissions
    const { data: userData } = await supabase
      .from('users')
      .select('role, city_id, permissions')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 })
    }

    // Verify user can manage this city
    if (userData.role !== 'super_admin' && userData.city_id !== currentEquipment.city_id) {
      return NextResponse.json({ error: 'אין הרשאה לנהל עיר זו' }, { status: 403 })
    }

    if (userData.role === 'city_manager' && userData.permissions !== 'full_access') {
      return NextResponse.json({ error: 'נדרשת הרשאת עריכה מלאה' }, { status: 403 })
    }

    // Update equipment
    const updateData: any = { updated_at: new Date().toISOString() }
    if (quantity !== undefined) updateData.quantity = quantity
    if (display_order !== undefined) updateData.display_order = display_order

    const { data: updatedEquipment, error } = await supabase
      .from('city_equipment')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        global_equipment:global_equipment_pool(
          *,
          category:equipment_categories(*)
        )
      `)
      .single()

    if (error) {
      console.error('Error updating city equipment:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ equipment: updatedEquipment })
  } catch (error) {
    console.error('Error in city equipment PUT:', error)
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
}

// DELETE - Remove equipment from city (doesn't affect global pool)
export async function DELETE(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'מזהה ציוד חובה' }, { status: 400 })
    }

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    // Get current equipment to verify city
    const { data: currentEquipment } = await supabase
      .from('city_equipment')
      .select('city_id')
      .eq('id', id)
      .single()

    if (!currentEquipment) {
      return NextResponse.json({ error: 'ציוד לא נמצא' }, { status: 404 })
    }

    // Check permissions
    const { data: userData } = await supabase
      .from('users')
      .select('role, city_id, permissions')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 })
    }

    // Verify user can manage this city
    if (userData.role !== 'super_admin' && userData.city_id !== currentEquipment.city_id) {
      return NextResponse.json({ error: 'אין הרשאה לנהל עיר זו' }, { status: 403 })
    }

    if (userData.role === 'city_manager' && userData.permissions !== 'full_access') {
      return NextResponse.json({ error: 'נדרשת הרשאת עריכה מלאה' }, { status: 403 })
    }

    // Delete the link (doesn't affect global pool or other cities)
    const { error } = await supabase
      .from('city_equipment')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error removing equipment from city:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'הפריט הוסר מהעיר' })
  } catch (error) {
    console.error('Error in city equipment DELETE:', error)
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
}
