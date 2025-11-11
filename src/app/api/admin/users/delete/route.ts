/**
 * API Route: Delete User
 * DELETE /api/admin/users/delete
 *
 * Permanently deletes a user from Supabase Auth and database
 * Only accessible by super_admin
 * WARNING: This action cannot be undone!
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth-middleware'
import { createServiceClient } from '@/lib/supabase-server'

export async function DELETE(request: NextRequest) {
  // Require super admin authentication
  const { user: adminUser, error: authError } = await requireSuperAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { user_id } = body

    // Validation
    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'חסר user_id' },
        { status: 400 }
      )
    }

    // Prevent admin from deleting themselves
    if (user_id === adminUser.id) {
      return NextResponse.json(
        { success: false, error: 'לא ניתן למחוק את עצמך' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user_id)
      .single()

    if (fetchError || !existingUser) {
      return NextResponse.json(
        { success: false, error: 'משתמש לא נמצא' },
        { status: 404 }
      )
    }

    // Log the activity BEFORE deletion
    await supabase
      .from('activity_logs')
      .insert({
        city_id: existingUser.city_id || null,
        manager_name: adminUser?.full_name || adminUser?.email || 'System',
        action: 'user_deleted',
        details: {
          deleted_user_email: existingUser.email,
          deleted_user_role: existingUser.role,
          deleted_user_name: existingUser.full_name,
        },
      })

    // Delete user from Supabase Auth
    // This will cascade delete from public.users table due to ON DELETE CASCADE
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user_id)

    if (deleteError) {
      console.error('Error deleting user from Auth:', deleteError)
      return NextResponse.json(
        { success: false, error: `שגיאה במחיקת משתמש: ${deleteError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'המשתמש נמחק בהצלחה',
    })

  } catch (error) {
    console.error('Error in delete user API:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאת שרת פנימית' },
      { status: 500 }
    )
  }
}
