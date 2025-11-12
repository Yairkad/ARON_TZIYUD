import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  try {
    const {
      cityId,
      manager1_name,
      manager1_phone,
      manager2_name,
      manager2_phone,
      location_url,
      token_location_url,
      location_description,
      location_image_url,
      lat,
      lng,
      token_lat,
      token_lng,
      request_mode,
      cabinet_code,
      require_call_id,
      hide_navigation
    } = await request.json()

    if (!cityId) {
      return NextResponse.json(
        { error: 'מזהה עיר הוא שדה חובה' },
        { status: 400 }
      )
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
      updateData.manager1_name = manager1_name.trim()
    }
    if (manager1_phone !== undefined) {
      updateData.manager1_phone = manager1_phone.trim()
    }
    if (manager2_name !== undefined) {
      updateData.manager2_name = manager2_name ? manager2_name.trim() : null
    }
    if (manager2_phone !== undefined) {
      updateData.manager2_phone = manager2_phone ? manager2_phone.trim() : null
    }
    if (location_url !== undefined) {
      updateData.location_url = location_url ? location_url.trim() : null
    }

    // הוספת שדות אופציונליים רק אם הם סופקו
    if (token_location_url !== undefined) {
      updateData.token_location_url = token_location_url ? token_location_url.trim() : null
    }
    if (location_description !== undefined) {
      updateData.location_description = location_description ? location_description.trim() : null
    }
    if (location_image_url !== undefined) {
      updateData.location_image_url = location_image_url ? location_image_url.trim() : null
    }
    if (lat !== undefined) {
      updateData.lat = lat
    }
    if (lng !== undefined) {
      updateData.lng = lng
    }
    if (token_lat !== undefined) {
      updateData.token_lat = token_lat
    }
    if (token_lng !== undefined) {
      updateData.token_lng = token_lng
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
  } catch (error) {
    console.error('Update city details error:', error)
    return NextResponse.json(
      { error: 'שגיאה בתהליך עדכון הפרטים' },
      { status: 500 }
    )
  }
}
