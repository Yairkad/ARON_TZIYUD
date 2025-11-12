/**
 * API Route: Reset User Password
 * POST /api/admin/users/reset-password
 *
 * Resets a user's password to a default or specified password
 * Only accessible by super_admin with full_access
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

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
    const { user_id, new_password } = body

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'חסר user_id' },
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

    // Check if user exists
    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select('email, full_name, role')
      .eq('id', user_id)
      .single()

    if (fetchError || !targetUser) {
      return NextResponse.json(
        { success: false, error: 'משתמש לא נמצא' },
        { status: 404 }
      )
    }

    // Reset password in Supabase Auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user_id,
      { password }
    )

    if (updateError) {
      console.error('Error resetting password:', updateError)
      return NextResponse.json(
        { success: false, error: `שגיאה באיפוס סיסמה: ${updateError.message}` },
        { status: 500 }
      )
    }

    // Log the activity
    await supabase
      .from('activity_logs')
      .insert({
        city_id: null,
        manager_name: authUser.email || 'System',
        action: 'password_reset',
        details: {
          target_user_email: targetUser.email,
          target_user_name: targetUser.full_name,
          target_user_role: targetUser.role,
        },
      })

    return NextResponse.json({
      success: true,
      message: `הסיסמה אופסה בהצלחה. הסיסמה החדשה: ${password}`,
      new_password: password,
    })

  } catch (error) {
    console.error('Error in reset password API:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאת שרת פנימית' },
      { status: 500 }
    )
  }
}
