import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// GET - Fetch all global equipment
export async function GET(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'active', 'pending_approval', 'archived'
    const includeCategories = searchParams.get('includeCategories') === 'true'

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    let query = supabase
      .from('global_equipment_pool')
      .select(includeCategories
        ? '*, category:equipment_categories(*)'
        : '*'
      )
      .order('name', { ascending: true })

    // Filter by status
    if (status) {
      query = query.eq('status', status)
    } else {
      // Non-super admins can only see active equipment
      if (userData?.role !== 'super_admin') {
        query = query.eq('status', 'active')
      }
    }

    const { data: equipment, error } = await query

    if (error) {
      console.error('Error fetching global equipment:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ equipment })
  } catch (error) {
    console.error('Error in global equipment GET:', error)
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
}

// POST - Add new equipment to global pool
export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const body = await request.json()
    const { name, image_url, category_id } = body

    // Validate input
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'שם הציוד חובה' }, { status: 400 })
    }

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    // Get user role and permissions
    const { data: userData } = await supabase
      .from('users')
      .select('role, permissions')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 })
    }

    // Check if equipment with same name already exists
    const { data: existing } = await supabase
      .from('global_equipment_pool')
      .select('id, name, status')
      .ilike('name', name.trim())
      .single()

    if (existing) {
      if (existing.status === 'archived') {
        return NextResponse.json({
          error: 'פריט זה היה במערכת ונמחק. אנא פנה למנהל ראשי לשחזורו.'
        }, { status: 400 })
      }
      return NextResponse.json({
        error: 'פריט עם שם זה כבר קיים במאגר'
      }, { status: 400 })
    }

    // Determine status based on role
    const status = userData.role === 'super_admin' ? 'active' : 'pending_approval'

    // Insert equipment
    const { data: newEquipment, error } = await supabase
      .from('global_equipment_pool')
      .insert({
        name: name.trim(),
        image_url,
        category_id,
        status,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating global equipment:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      equipment: newEquipment,
      message: status === 'pending_approval'
        ? 'הפריט נשלח לאישור מנהל ראשי'
        : 'הפריט נוסף בהצלחה למאגר'
    })
  } catch (error) {
    console.error('Error in global equipment POST:', error)
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
}

// PUT - Update equipment (Super Admin only)
export async function PUT(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const body = await request.json()
    const { id, name, image_url, category_id } = body

    if (!id) {
      return NextResponse.json({ error: 'מזהה ציוד חובה' }, { status: 400 })
    }

    // Check authentication and role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'super_admin') {
      return NextResponse.json({ error: 'רק מנהל ראשי יכול לערוך פריטים במאגר' }, { status: 403 })
    }

    // Check if new name conflicts with existing equipment
    if (name) {
      const { data: existing } = await supabase
        .from('global_equipment_pool')
        .select('id')
        .ilike('name', name.trim())
        .neq('id', id)
        .single()

      if (existing) {
        return NextResponse.json({
          error: 'פריט אחר עם שם זה כבר קיים במאגר'
        }, { status: 400 })
      }
    }

    // Update equipment
    const updateData: any = { updated_at: new Date().toISOString() }
    if (name !== undefined) updateData.name = name.trim()
    if (image_url !== undefined) updateData.image_url = image_url
    if (category_id !== undefined) updateData.category_id = category_id

    const { data: updatedEquipment, error } = await supabase
      .from('global_equipment_pool')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating global equipment:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ equipment: updatedEquipment })
  } catch (error) {
    console.error('Error in global equipment PUT:', error)
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
}

// DELETE - Archive equipment (Super Admin only)
export async function DELETE(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'מזהה ציוד חובה' }, { status: 400 })
    }

    // Check authentication and role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'super_admin') {
      return NextResponse.json({ error: 'רק מנהל ראשי יכול למחוק פריטים מהמאגר' }, { status: 403 })
    }

    // Archive instead of delete (keeps history)
    const { error } = await supabase
      .from('global_equipment_pool')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('Error archiving global equipment:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Note: CASCADE will remove from all cities automatically
    return NextResponse.json({ message: 'הפריט הוסר מהמאגר ומכל הערים' })
  } catch (error) {
    console.error('Error in global equipment DELETE:', error)
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
}
