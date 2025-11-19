import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// POST - Add multiple equipment items from global pool to city
export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const body = await request.json()
    const { city_id, equipment_ids } = body // equipment_ids: string[]

    if (!city_id || !equipment_ids || !Array.isArray(equipment_ids)) {
      return NextResponse.json({ error: 'חסרים פרמטרים או פורמט שגוי' }, { status: 400 })
    }

    if (equipment_ids.length === 0) {
      return NextResponse.json({ error: 'לא נבחרו פריטים' }, { status: 400 })
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

    // Verify all equipment items exist and are active
    const { data: globalEquipment, error: fetchError } = await supabase
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
    const { data: existingEquipment } = await supabase
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
    const { data: insertedEquipment, error: insertError } = await supabase
      .from('city_equipment')
      .insert(insertData)
      .select(`
        *,
        global_equipment:global_equipment_pool(
          *,
          equipment_categories(*)
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
