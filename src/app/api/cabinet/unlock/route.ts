/**
 * API Route: Unlock Cabinet
 * POST /api/cabinet/unlock
 *
 * Opens the cabinet lock for 0.5 seconds using eWeLink API
 * Requires super_admin or city_manager authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

interface UnlockRequest {
  cityId: string
  requestId?: string // Optional - for logging which request triggered the unlock
  reason?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const accessToken = request.cookies.get('sb-access-token')?.value

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'לא מורשה - נדרשת התחברות' },
        { status: 401 }
      )
    }

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'לא מורשה - נדרשת התחברות' },
        { status: 401 }
      )
    }

    // Get user profile and check permissions
    const { data: userProfile } = await supabase
      .from('users')
      .select('role, permissions, city_id, full_name, email')
      .eq('id', user.id)
      .single()

    if (!userProfile || !userProfile.is_active) {
      return NextResponse.json(
        { success: false, error: 'משתמש לא פעיל' },
        { status: 403 }
      )
    }

    const body: UnlockRequest = await request.json()

    if (!body.cityId) {
      return NextResponse.json(
        { success: false, error: 'חסר מזהה עיר' },
        { status: 400 }
      )
    }

    // Check if user has permission for this city
    const isSuperAdmin = userProfile.role === 'super_admin'
    const isCityManager = userProfile.role === 'city_manager' && userProfile.city_id === body.cityId
    const hasFullAccess = userProfile.permissions === 'full_access'

    if (!isSuperAdmin && (!isCityManager || !hasFullAccess)) {
      return NextResponse.json(
        { success: false, error: 'אין הרשאה לפתוח ארון זה - נדרשת הרשאת עריכה מלאה' },
        { status: 403 }
      )
    }

    // Get city details including eWeLink device ID
    const { data: city, error: cityError } = await supabase
      .from('cities')
      .select('id, name, ewelink_device_id')
      .eq('id', body.cityId)
      .single()

    if (cityError || !city) {
      return NextResponse.json(
        { success: false, error: 'עיר לא נמצאה' },
        { status: 404 }
      )
    }

    if (!city.ewelink_device_id) {
      return NextResponse.json(
        { success: false, error: 'לא הוגדר מזהה מכשיר eWeLink עבור עיר זו' },
        { status: 400 }
      )
    }

    // Unlock the cabinet using eWeLink API
    console.log('🔓 Unlocking cabinet for city:', city.name)
    console.log('📱 Device ID:', city.ewelink_device_id)

    const { getEWeLinkClient } = await import('@/lib/ewelink')

    let unlockSuccess = false
    try {
      const ewelinkClient = getEWeLinkClient()
      unlockSuccess = await ewelinkClient.unlockCabinet(city.ewelink_device_id)
    } catch (error) {
      console.error('❌ eWeLink error:', error)
      return NextResponse.json(
        { success: false, error: 'שגיאה בתקשורת עם מערכת המנעול' },
        { status: 500 }
      )
    }

    if (!unlockSuccess) {
      return NextResponse.json(
        { success: false, error: 'שגיאה בפתיחת המנעול - נסה שנית' },
        { status: 500 }
      )
    }

    // Log the unlock action
    await supabase
      .from('activity_logs')
      .insert({
        city_id: body.cityId,
        manager_name: userProfile.full_name || userProfile.email,
        action: 'cabinet_unlock',
        details: {
          request_id: body.requestId,
          reason: body.reason,
          device_id: city.ewelink_device_id,
          unlocked_by: user.id,
          unlocked_at: new Date().toISOString(),
        },
      })

    return NextResponse.json({
      success: true,
      message: 'הארון נפתח בהצלחה',
      cityName: city.name,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('❌ Error unlocking cabinet:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאה בפתיחת הארון' },
      { status: 500 }
    )
  }
}
