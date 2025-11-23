/**
 * API Route: Send Password Reset Email
 * POST /api/admin/users/send-reset-email
 *
 * Sends a password reset email to an existing user
 * Only accessible by super_admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { logEmail } from '@/lib/email'

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

    // Send password reset email via Supabase
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      body.email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`
      }
    )

    // Log the email
    await logEmail({
      recipientEmail: body.email,
      recipientName: user.full_name,
      emailType: 'password_reset',
      subject: 'איפוס סיסמה - ארון ציוד ידידים',
      status: resetError ? 'failed' : 'sent',
      errorMessage: resetError?.message,
      sentBy: adminProfile.email,
      metadata: {
        user_id: user.id
      }
    })

    if (resetError) {
      console.error('Error sending password reset email:', resetError)
      return NextResponse.json(
        { success: false, error: `שגיאה בשליחת מייל: ${resetError.message}` },
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
