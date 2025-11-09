import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const {
      cityId,
      manager1_name,
      manager1_phone,
      manager2_name,
      manager2_phone,
      location_url,
      request_mode,
      cabinet_code,
      require_call_id,
      hide_location
    } = await request.json()

    if (!cityId || !manager1_name || !manager1_phone) {
      return NextResponse.json(
        { error: 'שם וטלפון מנהל ראשון הם שדות חובה' },
        { status: 400 }
      )
    }

    if (manager1_phone.length !== 10 || !/^05\d{8}$/.test(manager1_phone)) {
      return NextResponse.json(
        { error: 'מספר טלפון מנהל ראשון חייב להיות בן 10 ספרות ולהתחיל ב-05' },
        { status: 400 }
      )
    }

    if (manager2_phone && (manager2_phone.length !== 10 || !/^05\d{8}$/.test(manager2_phone))) {
      return NextResponse.json(
        { error: 'מספר טלפון מנהל שני חייב להיות בן 10 ספרות ולהתחיל ב-05' },
        { status: 400 }
      )
    }

    // שליפת נתוני העיר הנוכחיים
    const { data: city, error: fetchError } = await supabaseServer
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
    const updateData: any = {
      manager1_name: manager1_name.trim(),
      manager1_phone: manager1_phone.trim(),
      manager2_name: manager2_name ? manager2_name.trim() : null,
      manager2_phone: manager2_phone ? manager2_phone.trim() : null,
      location_url: location_url ? location_url.trim() : null
    }

    // הוספת שדות אופציונליים רק אם הם סופקו
    if (request_mode !== undefined) {
      updateData.request_mode = request_mode
    }
    if (cabinet_code !== undefined) {
      updateData.cabinet_code = cabinet_code ? cabinet_code.trim() : null
    }
    if (require_call_id !== undefined) {
      updateData.require_call_id = require_call_id
    }
    if (hide_location !== undefined) {
      updateData.hide_location = hide_location
    }

    // עדכון העיר
    const { error: updateError } = await supabaseServer
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
    if (city.manager1_name !== updateData.manager1_name) changedFields.push('שם מנהל ראשון')
    if (city.manager1_phone !== updateData.manager1_phone) changedFields.push('טלפון מנהל ראשון')
    if (city.manager2_name !== updateData.manager2_name) changedFields.push('שם מנהל שני')
    if (city.manager2_phone !== updateData.manager2_phone) changedFields.push('טלפון מנהל שני')
    if (city.location_url !== updateData.location_url) changedFields.push('כתובת ארון')
    if (updateData.request_mode !== undefined && city.request_mode !== updateData.request_mode) {
      changedFields.push(updateData.request_mode === 'direct' ? 'שונה למצב השאלה ישירה' : 'שונה למצב בקשות')
    }
    if (updateData.cabinet_code !== undefined && city.cabinet_code !== updateData.cabinet_code) changedFields.push('קוד ארון')
    if (updateData.require_call_id !== undefined && city.require_call_id !== updateData.require_call_id) changedFields.push('דרישת מזהה קריאה')
    if (updateData.hide_location !== undefined && city.hide_location !== updateData.hide_location) changedFields.push(updateData.hide_location ? 'הסתרת מיקום הופעלה' : 'הסתרת מיקום בוטלה')

    if (changedFields.length > 0) {
      const { error: notificationError } = await supabaseServer
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
