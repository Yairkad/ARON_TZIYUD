/**
 * API Route: Send Password Reset Email
 * POST /api/admin/users/send-reset-email
 *
 * Sends a password reset email to an existing user
 * Only accessible by super_admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { logEmail, sendPasswordResetEmail } from '@/lib/email'
import crypto from 'crypto'

interface SendResetEmailBody {
  email: string
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const accessToken = request.cookies.get('sb-access-token')?.value

  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: 'לא מורשה - נדרשת התחברות' },
      { status: 401 }
    )
  }

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(accessToken)

  if (authError || !authUser) {
    return NextResponse.json(
      { success: false, error: 'לא מורשה - נדרשת התחברות' },
      { status: 401 }
    )
  }

  // Check if user is super admin
  const { data: adminProfile } = await supabase
    .from('users')
    .select('role, is_active, email')
    .eq('id', authUser.id)
    .single()

  if (!adminProfile || adminProfile.role !== 'super_admin' || !adminProfile.is_active) {
    return NextResponse.json(
      { success: false, error: 'אין הרשאה - נדרשת הרשאת מנהל ראשי' },
      { status: 403 }
    )
  }

  try {
    const body: SendResetEmailBody = await request.json()

    if (!body.email) {
      return NextResponse.json(
        { success: false, error: 'חסרה כתובת מייל' },
        { status: 400 }
      )
    }

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('email', body.email)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'משתמש לא נמצא במערכת' },
        { status: 404 }
      )
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1) // 1 hour

    console.log('📝 Saving reset token for user:', user.id, 'token:', resetToken.substring(0, 10) + '...')

    // Store token in users table
    const { error: updateError } = await supabase
      .from('users')
      .update({
        reset_token: resetToken,
        reset_token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('❌ Error saving reset token:', updateError)
      return NextResponse.json(
        { success: false, error: 'שגיאה בשמירת טוקן איפוס' },
        { status: 500 }
      )
    }

    console.log('✅ Token saved successfully to users table')

    // Send password reset email via Gmail SMTP
    const emailResult = await sendPasswordResetEmail(
      body.email,
      resetToken,
      user.full_name || 'משתמש'
    )

    // Log the email
    await logEmail({
      recipientEmail: body.email,
      recipientName: user.full_name,
      emailType: 'password_reset',
      subject: '🔑 איפוס סיסמה - ארון ציוד ידידים',
      status: emailResult.success ? 'sent' : 'failed',
      errorMessage: emailResult.error,
      sentBy: adminProfile.email,
      metadata: {
        user_id: user.id
      }
    })

    if (!emailResult.success) {
      console.error('Error sending password reset email:', emailResult.error)
      return NextResponse.json(
        { success: false, error: `שגיאה בשליחת מייל: ${emailResult.error}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `לינק לאיפוס סיסמה נשלח בהצלחה ל-${body.email}`,
    })

  } catch (error) {
    console.error('Error in send reset email API:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאת שרת פנימית' },
      { status: 500 }
    )
  }
}
