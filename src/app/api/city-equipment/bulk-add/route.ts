import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Helper to create authenticated Supabase client
async function createAuthClient() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()

  const accessTokenCookie = allCookies.find(cookie => cookie.name === 'sb-access-token')
  const accessToken = accessTokenCookie?.value

  return createClient(
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
}

// POST - Add multiple equipment items from global pool to city
export async function POST(request: Request) {
  try {
    const supabase = await createAuthClient()
    const body = await request.json()
    const { city_id, equipment_ids } = body // equipment_ids: string[]

    console.log('📦 Bulk add request:', { city_id, equipment_ids_count: equipment_ids?.length })

    if (!city_id || !equipment_ids || !Array.isArray(equipment_ids)) {
      console.log('❌ Missing parameters')
      return NextResponse.json({ error: 'חסרים פרמטרים או פורמט שגוי' }, { status: 400 })
    }

    if (equipment_ids.length === 0) {
      return NextResponse.json({ error: 'לא נבחרו פריטים' }, { status: 400 })
    }

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('🔐 Auth check:', { userId: user?.id, authError: authError?.message })

    if (!user) {
      console.log('❌ Not authenticated')
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    // Check permissions
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, city_id, permissions')
      .eq('id', user.id)
      .single()

    console.log('👤 User data:', { userData, userError: userError?.message })

    if (!userData) {
      console.log('❌ User not found in users table')
      return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 })
    }

    // Verify user can manage this city
    if (userData.role !== 'super_admin' && userData.city_id !== city_id) {
      console.log('❌ No permission for this city')
      return NextResponse.json({ error: 'אין הרשאה לנהל עיר זו' }, { status: 403 })
    }

    if (userData.role === 'city_manager' && userData.permissions !== 'full_access') {
      console.log('❌ City manager without full_access')
      return NextResponse.json({ error: 'נדרשת הרשאת עריכה מלאה' }, { status: 403 })
    }

    console.log('✅ Authorization passed')

    // Use service client for insert operations to bypass RLS
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify all equipment items exist and are active
    const { data: globalEquipment, error: fetchError } = await serviceClient
      .from('global_equipment_pool')
      .select('id, name, status')
      .in('id', equipment_ids)

    if (fetchError) {
      console.error('Error fetching global equipment:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!globalEquipment || globalEquipment.length !== equipment_ids.length) {
      return NextResponse.json({ error: 'חלק מהפריטים לא נמצאו במאגר' }, { status: 404 })
    }

    // Check if any are not active
    const inactiveItems = globalEquipment.filter(item => item.status !== 'active')
    if (inactiveItems.length > 0) {
      return NextResponse.json({
        error: `פריטים אלו לא פעילים במאגר: ${inactiveItems.map(i => i.name).join(', ')}`
      }, { status: 400 })
    }

    // Get existing equipment for this city to avoid duplicates
    const { data: existingEquipment } = await serviceClient
      .from('city_equipment')
      .select('global_equipment_id')
      .eq('city_id', city_id)

    const existingIds = new Set(existingEquipment?.map(e => e.global_equipment_id) || [])

    // Filter out already existing items
    const newEquipmentIds = equipment_ids.filter(id => !existingIds.has(id))

    if (newEquipmentIds.length === 0) {
      return NextResponse.json({
        message: 'כל הפריטים שנבחרו כבר קיימים בעיר',
        addedCount: 0,
        skippedCount: equipment_ids.length
      })
    }

    // Prepare batch insert data
    const insertData = newEquipmentIds.map(equipment_id => ({
      city_id,
      global_equipment_id: equipment_id,
      quantity: 0, // Default quantity
      display_order: null
    }))

    // Insert all at once
    const { data: insertedEquipment, error: insertError } = await serviceClient
      .from('city_equipment')
      .insert(insertData)
      .select(`
        *,
        global_equipment:global_equipment_pool(
          *,
          category:equipment_categories(*)
        )
      `)

    if (insertError) {
      console.error('Error bulk adding equipment:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    const skippedCount = equipment_ids.length - newEquipmentIds.length

    return NextResponse.json({
      equipment: insertedEquipment,
      message: `נוספו ${newEquipmentIds.length} פריטים בהצלחה${skippedCount > 0 ? ` (${skippedCount} פריטים כבר היו קיימים)` : ''}`,
      addedCount: newEquipmentIds.length,
      skippedCount
    })
  } catch (error) {
    console.error('Error in bulk add:', error)
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
}
