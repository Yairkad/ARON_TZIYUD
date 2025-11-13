/**
 * API Route: Update User
 * PUT /api/admin/users/update
 *
 * Updates user details, permissions, or deactivates user
 * Only accessible by super_admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

interface UpdateUserBody {
  user_id: string
  email?: string
  full_name?: string
  permissions?: 'view_only' | 'approve_requests' | 'full_access'
  phone?: string
  is_active?: boolean
  password?: string // Optional password change
  role?: 'city_manager' | 'super_admin'
  city_id?: string
  manager_role?: 'manager1' | 'manager2'
}

export async function PUT(request: NextRequest) {
  return handleUpdate(request)
}

export async function POST(request: NextRequest) {
  return handleUpdate(request)
}

async function handleUpdate(request: NextRequest) {
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
    .select('role, is_active, full_name, email')
    .eq('id', authUser.id)
    .single()

  if (!adminProfile || adminProfile.role !== 'super_admin' || !adminProfile.is_active) {
    return NextResponse.json(
      { success: false, error: 'אין הרשאה - נדרשת הרשאת מנהל ראשי' },
      { status: 403 }
    )
  }

  const adminUser = adminProfile

  try {
    const body: UpdateUserBody = await request.json()
    console.log('📝 Update user request:', { user_id: body.user_id, fields: Object.keys(body) })

    // Validation
    if (!body.user_id) {
      console.error('❌ Missing user_id in request')
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
      console.error('❌ User not found:', body.user_id, fetchError)
      return NextResponse.json(
        { success: false, error: 'משתמש לא נמצא' },
        { status: 404 }
      )
    }

    console.log('✅ Found user to update:', existingUser.email)

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

    if (body.email !== undefined) updateData.email = body.email
    if (body.full_name !== undefined) updateData.full_name = body.full_name
    if (body.permissions !== undefined) updateData.permissions = body.permissions
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.is_active !== undefined) updateData.is_active = body.is_active
    if (body.role !== undefined) updateData.role = body.role
    if (body.city_id !== undefined) updateData.city_id = body.city_id
    if (body.manager_role !== undefined) updateData.manager_role = body.manager_role

    // Update email in Auth if provided (must be done before updating public.users)
    if (body.email && body.email !== existingUser.email) {
      console.log('📧 Updating email from', existingUser.email, 'to', body.email)

      // Check if new email already exists
      const { data: existingEmailUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', body.email)
        .neq('id', body.user_id)
        .single()

      if (existingEmailUser) {
        console.error('❌ Email already in use:', body.email)
        return NextResponse.json(
          { success: false, error: 'כתובת המייל כבר בשימוש' },
          { status: 400 }
        )
      }

      const { error: emailError } = await supabase.auth.admin.updateUserById(
        body.user_id,
        { email: body.email }
      )

      if (emailError) {
        console.error('❌ Error updating email in Supabase Auth:', emailError)
        return NextResponse.json(
          { success: false, error: 'שגיאה בעדכון כתובת המייל' },
          { status: 500 }
        )
      }

      console.log('✅ Email updated in Supabase Auth')
    }

    // Update user in public.users table
    console.log('💾 Updating user in database:', updateData)
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', body.user_id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error updating user in database:', updateError)
      return NextResponse.json(
        { success: false, error: 'שגיאה בעדכון משתמש' },
        { status: 500 }
      )
    }

    console.log('✅ User updated in database')

    // Update password in Auth if provided
    if (body.password) {
      console.log('🔐 Updating password in Supabase Auth')
      const { error: passwordError } = await supabase.auth.admin.updateUserById(
        body.user_id,
        { password: body.password }
      )

      if (passwordError) {
        console.error('❌ Error updating password in Supabase Auth:', passwordError)
        return NextResponse.json(
          { success: false, error: 'שגיאה בעדכון סיסמה' },
          { status: 500 }
        )
      }

      console.log('✅ Password updated in Supabase Auth')
    }

    // Update city manager details if this is a city manager with manager_role
    const finalCityId = body.city_id !== undefined ? body.city_id : updatedUser.city_id
    const finalManagerRole = body.manager_role !== undefined ? body.manager_role : updatedUser.manager_role
    const finalFullName = body.full_name !== undefined ? body.full_name : updatedUser.full_name
    const finalPhone = body.phone !== undefined ? body.phone : updatedUser.phone

    if (finalCityId && finalManagerRole && (updatedUser.role === 'city_manager' || body.role === 'city_manager')) {
      console.log('🏙️ Updating city manager details for city:', finalCityId)
      const cityUpdateData: any = {}

      if (finalManagerRole === 'manager1') {
        cityUpdateData.manager1_name = finalFullName
        cityUpdateData.manager1_phone = finalPhone || null
      } else if (finalManagerRole === 'manager2') {
        cityUpdateData.manager2_name = finalFullName
        cityUpdateData.manager2_phone = finalPhone || null
      }

      const { error: cityUpdateError } = await supabase
        .from('cities')
        .update(cityUpdateData)
        .eq('id', finalCityId)

      if (cityUpdateError) {
        console.error('⚠️ Error updating city manager details (non-critical):', cityUpdateError)
        // Don't fail the user update, just log the error
      } else {
        console.log('✅ City manager details updated')
      }
    }

    // Log the activity (non-blocking - don't fail if logging fails)
    try {
      await supabase
        .from('activity_logs')
        .insert({
          city_id: existingUser.city_id || null,
          manager_name: adminUser?.full_name || adminUser?.email || 'System',
          action: 'user_updated',
          details: {
            updated_user_email: existingUser.email,
            changes: updateData,
            password_changed: !!body.password,
          },
        })
    } catch (logError) {
      console.error('⚠️ Failed to log activity (non-critical):', logError)
    }

    console.log('✅ User updated successfully:', updatedUser.email)

    return NextResponse.json({
      success: true,
      user: updatedUser,
    })

  } catch (error) {
    console.error('❌ Error in update user API:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Error details:', errorMessage)
    return NextResponse.json(
      {
        success: false,
        error: 'שגיאת שרת פנימית',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}
