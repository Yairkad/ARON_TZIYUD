import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'נדרשים כל השדות' },
        { status: 400 }
      )
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: 'הסיסמה החדשה חייבת להכיל לפחות 4 תווים' },
        { status: 400 }
      )
    }

    // Get access token from cookie
    const accessToken = request.cookies.get('sb-access-token')?.value

    if (!accessToken) {
      return NextResponse.json(
        { error: 'לא מורשה - נדרשת התחברות' },
        { status: 401 }
      )
    }

    // Get current user from Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'לא מורשה - נדרשת התחברות' },
        { status: 401 }
      )
    }

    // Get user profile to verify they are super-admin
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('email, role, is_active')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile || !userProfile.is_active) {
      return NextResponse.json(
        { error: 'משתמש לא נמצא או לא פעיל' },
        { status: 403 }
      )
    }

    // Verify user is super-admin
    if (userProfile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'אין הרשאה - נדרשת הרשאת מנהל על' },
        { status: 403 }
      )
    }

    // Verify current password by trying to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userProfile.email,
      password: currentPassword
    })

    if (signInError) {
      return NextResponse.json(
        { error: 'הסיסמה הנוכחית שגויה' },
        { status: 401 }
      )
    }

    // Update password in Supabase Auth using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (updateError) {
      console.error('❌ Error updating super-admin password:', updateError)
      return NextResponse.json(
        { error: 'שגיאה בעדכון הסיסמה' },
        { status: 500 }
      )
    }

    console.log('✅ Super-admin password changed successfully for:', userProfile.email)

    // Sign in with new password to get new tokens
    const { data: newSession, error: reAuthError } = await supabase.auth.signInWithPassword({
      email: userProfile.email,
      password: newPassword
    })

    if (reAuthError || !newSession.session) {
      console.error('Error re-authenticating after password change:', reAuthError)
      // Password was changed successfully, but re-auth failed
      // Client should handle re-login manually
      return NextResponse.json({
        success: true,
        requireReLogin: true,
        message: 'הסיסמה שונתה בהצלחה. יש להתחבר מחדש.'
      })
    }

    // Return new tokens for client to update cookies
    return NextResponse.json({
      success: true,
      passwordChanged: true,
      newAccessToken: newSession.session.access_token,
      newRefreshToken: newSession.session.refresh_token,
      message: 'הסיסמה שונתה בהצלחה'
    })
  } catch (error) {
    console.error('❌ Change super-admin password error:', error)
    return NextResponse.json(
      { error: 'שגיאה בתהליך שינוי הסיסמה' },
      { status: 500 }
    )
  }
}
