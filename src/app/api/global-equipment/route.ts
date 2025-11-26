import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Helper to create authenticated Supabase client
async function createAuthClient() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()

  // Find the access token cookie - it's stored as 'sb-access-token'
  const accessTokenCookie = allCookies.find(cookie => cookie.name === 'sb-access-token')
  const accessToken = accessTokenCookie?.value

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    accessToken ? {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    } : {}
  )

  return supabase
}

// GET - Fetch all global equipment
export async function GET(request: Request) {
  try {
    const supabase = await createAuthClient()
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
    const supabase = await createAuthClient()
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

    // Use service client to bypass RLS for all authenticated users
    const insertClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Insert equipment
    const { data: newEquipment, error } = await insertClient
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
    const supabase = await createAuthClient()
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

    // Use service client for super_admin operations
    const updateClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data: updatedEquipment, error } = await updateClient
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

// DELETE - Delete equipment permanently (Super Admin only)
export async function DELETE(request: Request) {
  try {
    const authClient = await createAuthClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'מזהה ציוד חובה' }, { status: 400 })
    }

    // Check authentication and role
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    const { data: userData } = await authClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'super_admin') {
      return NextResponse.json({ error: 'רק מנהל ראשי יכול למחוק פריטים מהמאגר' }, { status: 403 })
    }

    // Use service client for deletion
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get equipment name for notification
    const { data: equipmentData } = await supabase
      .from('global_equipment_pool')
      .select('name')
      .eq('id', id)
      .single()

    const equipmentName = equipmentData?.name || 'פריט לא ידוע'

    // Get all cities using this equipment before deleting
    const { data: citiesUsing } = await supabase
      .from('city_equipment')
      .select('city_id, cities(id, name)')
      .eq('global_equipment_id', id)

    // Send notifications to affected cities BEFORE deleting
    if (citiesUsing && citiesUsing.length > 0) {
      const notifications = citiesUsing.map((item: any) => ({
        city_id: item.city_id,
        city_name: item.cities?.name || 'עיר לא ידועה',
        message: `הפריט "${equipmentName}" הוסר מהמאגר הגלובלי. יש לבחור פריט חלופי מהמאגר.`,
        is_read: false
      }))

      await supabase
        .from('admin_notifications')
        .insert(notifications)
    }

    // Delete from city_equipment first (foreign key constraint)
    await supabase
      .from('city_equipment')
      .delete()
      .eq('global_equipment_id', id)

    // Delete permanently from global pool
    const { error } = await supabase
      .from('global_equipment_pool')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting global equipment:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      message: 'הפריט נמחק לצמיתות מהמאגר ומכל הערים',
      affectedCities: citiesUsing?.length || 0
    })
  } catch (error) {
    console.error('Error in global equipment DELETE:', error)
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
}
