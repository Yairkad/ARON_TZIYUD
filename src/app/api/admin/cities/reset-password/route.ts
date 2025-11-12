/**
 * API Route: Reset City Password
 * POST /api/admin/cities/reset-password
 *
 * Resets a city's password to a default or specified password
 * Only accessible by super_admin with full_access
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()

  // Get access token from cookies
  const accessToken = request.cookies.get('sb-access-token')?.value

  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: 'לא מורשה - נדרשת התחברות' },
      { status: 401 }
    )
  }

  // Get admin user
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(accessToken)

  if (authError || !authUser) {
    return NextResponse.json(
      { success: false, error: 'לא מורשה - נדרשת התחברות' },
      { status: 401 }
    )
  }

  // Check if user is super admin with full access
  const { data: adminProfile, error: profileError } = await supabase
    .from('users')
    .select('role, permissions, is_active')
    .eq('id', authUser.id)
    .single()

  if (profileError || !adminProfile) {
    return NextResponse.json(
      { success: false, error: 'משתמש לא נמצא במערכת' },
      { status: 404 }
    )
  }

  if (adminProfile.role !== 'super_admin' || adminProfile.permissions !== 'full_access') {
    return NextResponse.json(
      { success: false, error: 'אין הרשאה - נדרשת הרשאת מנהל ראשי עם גישה מלאה' },
      { status: 403 }
    )
  }

  if (!adminProfile.is_active) {
    return NextResponse.json(
      { success: false, error: 'המשתמש לא פעיל' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { city_id, new_password } = body

    if (!city_id) {
      return NextResponse.json(
        { success: false, error: 'חסר city_id' },
        { status: 400 }
      )
    }

    // Default password if not provided
    const password = new_password || '123456'

    if (password.length < 4) {
      return NextResponse.json(
        { success: false, error: 'הסיסמה חייבת להכיל לפחות 4 תווים' },
        { status: 400 }
      )
    }

    // Check if city exists
    const { data: city, error: fetchError } = await supabase
      .from('cities')
      .select('id, name, is_active')
      .eq('id', city_id)
      .single()

    if (fetchError || !city) {
      return NextResponse.json(
        { success: false, error: 'עיר לא נמצאה' },
        { status: 404 }
      )
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Update password in cities table
    const { error: updateError } = await supabase
      .from('cities')
      .update({ password: hashedPassword })
      .eq('id', city_id)

    if (updateError) {
      console.error('Error resetting city password:', updateError)
      return NextResponse.json(
        { success: false, error: `שגיאה באיפוס סיסמה: ${updateError.message}` },
        { status: 500 }
      )
    }

    // Log the activity
    await supabase
      .from('activity_logs')
      .insert({
        city_id: city_id,
        manager_name: authUser.email || 'System',
        action: 'city_password_reset',
        details: {
          city_name: city.name,
        },
      })

    return NextResponse.json({
      success: true,
      message: `הסיסמה של העיר "${city.name}" אופסה בהצלחה. הסיסמה החדשה: ${password}`,
      new_password: password,
    })

  } catch (error) {
    console.error('Error in reset city password API:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאת שרת פנימית' },
      { status: 500 }
    )
  }
}
