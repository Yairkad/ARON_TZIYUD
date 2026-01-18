import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { requireFullAccess } from '@/lib/auth-middleware'

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  try {
    console.log('📝 Update city details - Request received')
    const body = await request.json()
    console.log('📝 Request body keys:', Object.keys(body))
    console.log('📝 location_image size:', body.location_image ? body.location_image.length : 0)

    const {
      cityId,
      manager1_name,
      manager1_phone,
      manager2_name,
      manager2_phone,
      show_manager1_contact,
      override_manager1_name,
      override_manager1_phone,
      show_manager2_contact,
      override_manager2_name,
      override_manager2_phone,
      location_url,
      token_location_url,
      location_image,
      location_description,
      lat,
      lng,
      token_lat,
      token_lng,
      request_mode,
      cabinet_code,
      require_call_id,
      hide_navigation,
      enable_push_notifications,
      max_request_distance_km,
      is_temporarily_closed,
      closure_message,
      require_return_photo
    } = body

    if (!cityId) {
      return NextResponse.json(
        { error: 'מזהה עיר הוא שדה חובה' },
        { status: 400 }
      )
    }

    // Check if location_image is too large (max 2MB base64 ≈ 2.7MB string)
    if (location_image && location_image.length > 3000000) {
      return NextResponse.json(
        { error: 'תמונת המיקום גדולה מדי. הגבלה: 2MB' },
        { status: 400 }
      )
    }

    // Check permissions - require full access for the city
    const { user, error: authError } = await requireFullAccess(request, cityId)
    if (authError) {
      return authError
    }

    // Validate manager1 phone only if provided
    if (manager1_phone && (manager1_phone.length !== 10 || !/^05\d{8}$/.test(manager1_phone))) {
      return NextResponse.json(
        { error: 'מספר טלפון מנהל ראשון חייב להיות בן 10 ספרות ולהתחיל ב-05' },
        { status: 400 }
      )
    }

    // Validate manager2 phone only if provided
    if (manager2_phone && (manager2_phone.length !== 10 || !/^05\d{8}$/.test(manager2_phone))) {
      return NextResponse.json(
        { error: 'מספר טלפון מנהל שני חייב להיות בן 10 ספרות ולהתחיל ב-05' },
        { status: 400 }
      )
    }

    // שליפת נתוני העיר הנוכחיים
    const { data: city, error: fetchError } = await supabase
      .from('cities')
      .select('*')
      .eq('id', cityId)
      .single()

    if (fetchError || !city) {
      console.error('Error fetching city:', fetchError)
      return NextResponse.json(
        { error: 'עיר לא נמצאה' },
        { status: 404 }
      )
    }

    // הכנת נתוני העדכון
    const updateData: any = {}

    // Update manager details only if provided
    if (manager1_name !== undefined) {
      updateData.manager1_name = manager1_name ? manager1_name.trim() : null
    }
    if (manager1_phone !== undefined) {
      updateData.manager1_phone = manager1_phone ? manager1_phone.trim() : null
    }
    if (manager2_name !== undefined) {
      updateData.manager2_name = manager2_name ? manager2_name.trim() : null
    }
    if (manager2_phone !== undefined) {
      updateData.manager2_phone = manager2_phone ? manager2_phone.trim() : null
    }
    // Contact visibility settings
    if (show_manager1_contact !== undefined) {
      updateData.show_manager1_contact = show_manager1_contact
    }
    if (override_manager1_name !== undefined) {
      updateData.override_manager1_name = override_manager1_name ? override_manager1_name.trim() : null
    }
    if (override_manager1_phone !== undefined) {
      updateData.override_manager1_phone = override_manager1_phone ? override_manager1_phone.trim() : null
    }
    if (show_manager2_contact !== undefined) {
      updateData.show_manager2_contact = show_manager2_contact
    }
    if (override_manager2_name !== undefined) {
      updateData.override_manager2_name = override_manager2_name ? override_manager2_name.trim() : null
    }
    if (override_manager2_phone !== undefined) {
      updateData.override_manager2_phone = override_manager2_phone ? override_manager2_phone.trim() : null
    }
    if (location_url !== undefined) {
      updateData.location_url = location_url ? location_url.trim() : null
    }

    // הוספת שדות אופציונליים רק אם הם סופקו
    if (token_location_url !== undefined) {
      updateData.token_location_url = token_location_url && typeof token_location_url === 'string' ? token_location_url.trim() : null
    }
    if (location_image !== undefined) {
      updateData.location_image = location_image && typeof location_image === 'string' ? location_image : null
    }
    if (location_description !== undefined) {
      updateData.location_description = location_description && typeof location_description === 'string' ? location_description.trim() : null
    }
    if (lat !== undefined) {
      updateData.lat = lat
    }
    if (lng !== undefined) {
      updateData.lng = lng
    }
    if (token_lat !== undefined) {
      updateData.token_lat = token_lat
      // Also update public_lat for map display (if not already set or syncing with token)
      if (token_lat !== null) {
        updateData.public_lat = token_lat
      }
    }
    if (token_lng !== undefined) {
      updateData.token_lng = token_lng
      // Also update public_lng for map display (if not already set or syncing with token)
      if (token_lng !== null) {
        updateData.public_lng = token_lng
      }
    }
    if (request_mode !== undefined) {
      updateData.request_mode = request_mode
    }
    if (cabinet_code !== undefined) {
      updateData.cabinet_code = cabinet_code ? cabinet_code.trim() : null
    }
    if (require_call_id !== undefined) {
      updateData.require_call_id = require_call_id
    }
    if (hide_navigation !== undefined) {
      updateData.hide_navigation = hide_navigation
    }
    if (enable_push_notifications !== undefined) {
      updateData.enable_push_notifications = enable_push_notifications
    }
    if (max_request_distance_km !== undefined) {
      updateData.max_request_distance_km = max_request_distance_km
    }
    if (is_temporarily_closed !== undefined) {
      updateData.is_temporarily_closed = is_temporarily_closed
    }
    if (closure_message !== undefined) {
      updateData.closure_message = closure_message ? closure_message.trim() : null
    }
    if (require_return_photo !== undefined) {
      updateData.require_return_photo = require_return_photo
    }

    // עדכון העיר
    const { error: updateError } = await supabase
      .from('cities')
      .update(updateData)
      .eq('id', cityId)

    if (updateError) {
      console.error('Error updating city:', updateError)
      return NextResponse.json(
        { error: 'שגיאה בעדכון פרטי העיר' },
        { status: 500 }
      )
    }

    // Update user table if the logged-in user changed their own name/phone
    if (user && city.manager1_user_id === user.id) {
      const userUpdateData: any = {}
      if (updateData.manager1_name !== undefined) userUpdateData.full_name = updateData.manager1_name
      if (updateData.manager1_phone !== undefined) userUpdateData.phone = updateData.manager1_phone

      if (Object.keys(userUpdateData).length > 0) {
        await supabase
          .from('users')
          .update(userUpdateData)
          .eq('id', user.id)
        console.log('✅ Updated user table for manager1')
      }
    } else if (user && city.manager2_user_id === user.id) {
      const userUpdateData: any = {}
      if (updateData.manager2_name !== undefined) userUpdateData.full_name = updateData.manager2_name
      if (updateData.manager2_phone !== undefined) userUpdateData.phone = updateData.manager2_phone

      if (Object.keys(userUpdateData).length > 0) {
        await supabase
          .from('users')
          .update(userUpdateData)
          .eq('id', user.id)
        console.log('✅ Updated user table for manager2')
      }
    }

    // יצירת התראה למנהל על
    const changedFields = []
    if (updateData.manager1_name !== undefined && city.manager1_name !== updateData.manager1_name) changedFields.push('שם מנהל ראשון')
    if (updateData.manager1_phone !== undefined && city.manager1_phone !== updateData.manager1_phone) changedFields.push('טלפון מנהל ראשון')
    if (updateData.manager2_name !== undefined && city.manager2_name !== updateData.manager2_name) changedFields.push('שם מנהל שני')
    if (updateData.manager2_phone !== undefined && city.manager2_phone !== updateData.manager2_phone) changedFields.push('טלפון מנהל שני')
    if (updateData.location_url !== undefined && city.location_url !== updateData.location_url) changedFields.push('כתובת ארון בדף ראשי')
    if (updateData.token_location_url !== undefined && city.token_location_url !== updateData.token_location_url) changedFields.push('כתובת ארון בטוקן')
    if (updateData.request_mode !== undefined && city.request_mode !== updateData.request_mode) {
      changedFields.push(updateData.request_mode === 'direct' ? 'שונה למצב השאלה ישירה' : 'שונה למצב בקשות')
    }
    if (updateData.cabinet_code !== undefined && city.cabinet_code !== updateData.cabinet_code) changedFields.push('קוד ארון')
    if (updateData.require_call_id !== undefined && city.require_call_id !== updateData.require_call_id) changedFields.push('דרישת מזהה קריאה')
    if (updateData.hide_navigation !== undefined && city.hide_navigation !== updateData.hide_navigation) changedFields.push('הצגת ניווט')
    if (updateData.enable_push_notifications !== undefined && city.enable_push_notifications !== updateData.enable_push_notifications) changedFields.push('התראות דחיפה')
    if (updateData.max_request_distance_km !== undefined && city.max_request_distance_km !== updateData.max_request_distance_km) changedFields.push('טווח מרחק לבקשות')
    if (updateData.require_return_photo !== undefined && city.require_return_photo !== updateData.require_return_photo) changedFields.push('צילום בהחזרה')
    if (updateData.is_temporarily_closed !== undefined && city.is_temporarily_closed !== updateData.is_temporarily_closed) {
      changedFields.push(updateData.is_temporarily_closed ? 'הארון נסגר זמנית' : 'הארון נפתח')

      // Send push notification to super admins
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/push/send-to-super-admins`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: updateData.is_temporarily_closed ? 'ארון נסגר' : 'ארון נפתח',
            body: `${city.name}: ${updateData.is_temporarily_closed ? 'הארון נסגר זמנית' : 'הארון נפתח מחדש'}`,
            url: '/super-admin?tab=cities',
            type: 'cabinet-status-change'
          })
        })
      } catch (pushError) {
        console.error('Error sending push to super admins:', pushError)
      }
    }

    if (changedFields.length > 0) {
      const { error: notificationError } = await supabase
        .from('admin_notifications')
        .insert({
          city_id: cityId,
          city_name: city.name,
          message: `עודכנו פרטי העיר: ${changedFields.join(', ')}`,
          is_read: false
        })

      if (notificationError) {
        console.error('Error creating notification:', notificationError)
        // לא נכשיל את הבקשה בגלל שגיאת התראה
      }
    }

    return NextResponse.json({
      success: true,
      message: 'הפרטים עודכנו בהצלחה'
    })
  } catch (error: any) {
    console.error('Update city details error:', error)
    console.error('Error message:', error?.message)
    console.error('Error stack:', error?.stack)
    return NextResponse.json(
      { error: `שגיאה בתהליך עדכון הפרטים: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    )
  }
}
