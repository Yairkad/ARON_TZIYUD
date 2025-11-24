/**
 * API Route: Delete Email Log
 * POST /api/admin/email-logs/delete
 *
 * Deletes an email log record
 * Only accessible by super_admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

interface DeleteEmailLogBody {
  log_id: string
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
    .select('role, is_active')
    .eq('id', authUser.id)
    .single()

  if (!adminProfile || adminProfile.role !== 'super_admin' || !adminProfile.is_active) {
    return NextResponse.json(
      { success: false, error: 'אין הרשאה - נדרשת הרשאת מנהל ראשי' },
      { status: 403 }
    )
  }

  try {
    const body: DeleteEmailLogBody = await request.json()

    if (!body.log_id) {
      return NextResponse.json(
        { success: false, error: 'חסר מזהה רשומה' },
        { status: 400 }
      )
    }

    // Delete the email log
    const { error: deleteError } = await supabase
      .from('email_logs')
      .delete()
      .eq('id', body.log_id)

    if (deleteError) {
      console.error('Error deleting email log:', deleteError)
      return NextResponse.json(
        { success: false, error: 'שגיאה במחיקת רשומת המייל' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'רשומת המייל נמחקה בהצלחה'
    })

  } catch (error) {
    console.error('Error in delete email log API:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאת שרת פנימית' },
      { status: 500 }
    )
  }
}
