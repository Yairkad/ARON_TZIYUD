/**
 * API Route: Email Logs
 * GET /api/admin/email-logs
 *
 * Returns list of sent emails for super admin tracking
 * Only accessible by super_admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Authenticate user using access token from cookies
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
    // Get query params for filtering
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const emailType = searchParams.get('type')
    const searchQuery = searchParams.get('search')

    // Build query
    let query = supabase
      .from('email_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (emailType && emailType !== 'all') {
      query = query.eq('email_type', emailType)
    }

    if (searchQuery) {
      query = query.or(`recipient_email.ilike.%${searchQuery}%,recipient_name.ilike.%${searchQuery}%`)
    }

    const { data: logs, error, count } = await query

    if (error) {
      console.error('Error fetching email logs:', error)
      return NextResponse.json(
        { success: false, error: 'שגיאה בטעינת לוגים' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      logs: logs || [],
      total: count || 0,
      limit,
      offset
    })

  } catch (error) {
    console.error('Error in email logs API:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאת שרת' },
      { status: 500 }
    )
  }
}
