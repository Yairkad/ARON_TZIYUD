/**
 * API Route: Update User
 * PUT /api/admin/users/update
 *
 * Updates user details, permissions, or deactivates user
 * Only accessible by super_admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth-middleware'
import { createServiceClient } from '@/lib/supabase-server'

interface UpdateUserBody {
  user_id: string
  full_name?: string
  permissions?: 'view_only' | 'approve_requests' | 'full_access'
  phone?: string
  is_active?: boolean
  password?: string // Optional password change
}

export async function PUT(request: NextRequest) {
  // Require super admin authentication
  const { user: adminUser, error: authError } = await requireSuperAdmin(request)
  if (authError) return authError

  try {
    const body: UpdateUserBody = await request.json()

    // Validation
    if (!body.user_id) {
      return NextResponse.json(
        { success: false, error: 'חסר user_id' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', body.user_id)
      .single()

    if (fetchError || !existingUser) {
      return NextResponse.json(
        { success: false, error: 'משתמש לא נמצא' },
        { status: 404 }
      )
    }

    // Prevent changing super_admin permissions
    if (existingUser.role === 'super_admin' && body.permissions && body.permissions !== 'full_access') {
      return NextResponse.json(
        { success: false, error: 'לא ניתן לשנות הרשאות של מנהל ראשי' },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (body.full_name !== undefined) updateData.full_name = body.full_name
    if (body.permissions !== undefined) updateData.permissions = body.permissions
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.is_active !== undefined) updateData.is_active = body.is_active

    // Update user in public.users table
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', body.user_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating user:', updateError)
      return NextResponse.json(
        { success: false, error: 'שגיאה בעדכון משתמש' },
        { status: 500 }
      )
    }

    // Update password in Auth if provided
    if (body.password) {
      const { error: passwordError } = await supabase.auth.admin.updateUserById(
        body.user_id,
        { password: body.password }
      )

      if (passwordError) {
        console.error('Error updating password:', passwordError)
        return NextResponse.json(
          { success: false, error: 'שגיאה בעדכון סיסמה' },
          { status: 500 }
        )
      }
    }

    // Log the activity
    await supabase
      .from('activity_logs')
      .insert({
        city_id: existingUser.city_id || null,
        manager_name: adminUser.full_name || adminUser.email,
        action: 'user_updated',
        details: {
          updated_user_email: existingUser.email,
          changes: updateData,
          password_changed: !!body.password,
        },
      })

    return NextResponse.json({
      success: true,
      user: updatedUser,
    })

  } catch (error) {
    console.error('Error in update user API:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאת שרת פנימית' },
      { status: 500 }
    )
  }
}
