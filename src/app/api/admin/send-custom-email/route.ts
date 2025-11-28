/**
 * API Route: Send Custom Email
 * POST /api/admin/send-custom-email
 *
 * Allows super admin to send custom emails to users
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { sendCustomEmail, logEmail } from '@/lib/email'

interface SendCustomEmailBody {
  to: string
  subject: string
  message: string
  recipientName?: string
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
    const body: SendCustomEmailBody = await request.json()

    if (!body.to || !body.subject || !body.message) {
      return NextResponse.json(
        { success: false, error: 'חסרים שדות חובה (נמען, נושא, תוכן)' },
        { status: 400 }
      )
    }

    // Send email
    const emailResult = await sendCustomEmail(
      body.to,
      body.subject,
      body.message,
      body.recipientName
    )

    // Log the email
    await logEmail({
      recipientEmail: body.to,
      recipientName: body.recipientName,
      emailType: 'other',
      subject: body.subject,
      status: emailResult.success ? 'sent' : 'failed',
      errorMessage: emailResult.error,
      sentBy: adminProfile.email,
      metadata: {
        custom_message: true
      }
    })

    if (!emailResult.success) {
      console.error('Error sending custom email:', emailResult.error)
      return NextResponse.json(
        { success: false, error: `שגיאה בשליחת מייל: ${emailResult.error}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `מייל נשלח בהצלחה ל-${body.to}`
    })

  } catch (error) {
    console.error('Error in send custom email API:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאת שרת פנימית' },
      { status: 500 }
    )
  }
}
