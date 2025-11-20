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

// Service client for admin operations
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// POST - Merge two equipment items
export async function POST(request: Request) {
  try {
    const authClient = await createAuthClient()
    const body = await request.json()
    const { sourceId, targetId } = body

    if (!sourceId || !targetId) {
      return NextResponse.json({ error: 'חסרים פרמטרים' }, { status: 400 })
    }

    if (sourceId === targetId) {
      return NextResponse.json({ error: 'לא ניתן למזג פריט לעצמו' }, { status: 400 })
    }

    // Check authentication
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    // Verify user is super admin
    const { data: userData } = await authClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'super_admin') {
      return NextResponse.json({ error: 'רק מנהל ראשי יכול למזג פריטים' }, { status: 403 })
    }

    // Use service client for the actual merge operations
    const supabase = createServiceClient()

    // Verify both equipment items exist
    const { data: sourceEquipment } = await supabase
      .from('global_equipment_pool')
      .select('id, name')
      .eq('id', sourceId)
      .single()

    const { data: targetEquipment } = await supabase
      .from('global_equipment_pool')
      .select('id, name')
      .eq('id', targetId)
      .single()

    if (!sourceEquipment || !targetEquipment) {
      return NextResponse.json({ error: 'אחד הפריטים לא נמצא' }, { status: 404 })
    }

    // Get cities that already have the target equipment
    const { data: existingTargetCities } = await supabase
      .from('city_equipment')
      .select('city_id')
      .eq('global_equipment_id', targetId)

    const existingCityIds = existingTargetCities?.map(e => e.city_id) || []

    // Delete source equipment entries for cities that already have the target (to avoid duplicates)
    if (existingCityIds.length > 0) {
      const { error: deleteDupError } = await supabase
        .from('city_equipment')
        .delete()
        .eq('global_equipment_id', sourceId)
        .in('city_id', existingCityIds)

      if (deleteDupError) {
        console.error('Error deleting duplicate city equipment:', deleteDupError)
        // Continue anyway, the update might still work
      }
    }

    // Update remaining city_equipment records to point to the target
    const { error: updateError } = await supabase
      .from('city_equipment')
      .update({ global_equipment_id: targetId })
      .eq('global_equipment_id', sourceId)

    if (updateError) {
      console.error('Error updating city equipment:', updateError)
      return NextResponse.json({ error: 'שגיאה בעדכון ציוד הערים: ' + updateError.message }, { status: 500 })
    }

    // Delete ALL remaining city_equipment records for the source (should not exist, but just in case)
    await supabase
      .from('city_equipment')
      .delete()
      .eq('global_equipment_id', sourceId)

    // Delete the source equipment from global pool
    const { data: deletedData, error: deleteError } = await supabase
      .from('global_equipment_pool')
      .delete()
      .eq('id', sourceId)
      .select()

    if (deleteError) {
      console.error('Error deleting source equipment:', deleteError)
      return NextResponse.json({ error: 'שגיאה במחיקת הפריט המקורי: ' + deleteError.message }, { status: 500 })
    }

    // Verify deletion actually happened
    const { data: checkDeleted } = await supabase
      .from('global_equipment_pool')
      .select('id')
      .eq('id', sourceId)
      .single()

    if (checkDeleted) {
      console.error('Source equipment still exists after deletion attempt')
      return NextResponse.json({ error: 'הפריט המקורי לא נמחק - ייתכן שיש לו תלויות' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `הפריט "${sourceEquipment.name}" מוזג בהצלחה לתוך "${targetEquipment.name}"`
    })
  } catch (error) {
    console.error('Error in merge equipment:', error)
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
}
