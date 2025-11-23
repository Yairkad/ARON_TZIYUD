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
    if (body.phone !== undefined) updateData.phone = body.phone || null
    if (body.is_active !== undefined) updateData.is_active = body.is_active
    if (body.role !== undefined) updateData.role = body.role

    // Handle city_id update for city_manager role
    // The constraint city_manager_has_city requires city_manager to have a city_id
    if (body.city_id !== undefined) {
      updateData.city_id = body.city_id || null
    } else if (body.role === 'city_manager' && !existingUser.city_id) {
      // If changing to city_manager and no city_id provided and user has no city_id
      // This will fail the constraint - the caller must provide a city_id
      console.error('❌ Cannot set role to city_manager without a city_id')
      return NextResponse.json(
        { success: false, error: 'לא ניתן להגדיר תפקיד מנהל עיר ללא שיוך לעיר. יש לבחור עיר.' },
        { status: 400 }
      )
    }

    // Update manager_role if provided
    if (body.manager_role !== undefined) {
      updateData.manager_role = body.manager_role
    }

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

      // Send password reset email to new address so user can set their password
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        body.email,
        {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`
        }
      )

      if (resetError) {
        console.error('⚠️ Error sending password reset to new email:', resetError)
      } else {
        console.log('✅ Password reset email sent to new address')
      }
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

    // If adding a new city_id, link the user to the city
    if (body.city_id && body.manager_role) {
      const cityUpdateData: any = {}

      if (body.manager_role === 'manager1') {
        cityUpdateData.manager1_user_id = body.user_id
        cityUpdateData.manager1_name = body.full_name || updatedUser.full_name
        cityUpdateData.manager1_phone = body.phone || updatedUser.phone || null
      } else if (body.manager_role === 'manager2') {
        cityUpdateData.manager2_user_id = body.user_id
        cityUpdateData.manager2_name = body.full_name || updatedUser.full_name
        cityUpdateData.manager2_phone = body.phone || updatedUser.phone || null
      }

      if (Object.keys(cityUpdateData).length > 0) {
        const { error: cityLinkError } = await supabase
          .from('cities')
          .update(cityUpdateData)
          .eq('id', body.city_id)

        if (cityLinkError) {
          console.error('❌ Error linking user to city:', cityLinkError)
        } else {
          console.log('✅ User linked to city as', body.manager_role)
        }
      }
    }

    // Update manager name/phone in ALL cities this user manages
    if ((updatedUser.role === 'city_manager' || body.role === 'city_manager') && (body.full_name !== undefined || body.phone !== undefined)) {
      const finalFullName = body.full_name !== undefined ? body.full_name : updatedUser.full_name
      const finalPhone = body.phone !== undefined ? body.phone : updatedUser.phone

      // Get all cities managed by this user
      const { data: managedCities } = await supabase
        .from('cities')
        .select('id, manager1_user_id, manager2_user_id')
        .or(`manager1_user_id.eq.${body.user_id},manager2_user_id.eq.${body.user_id}`)

      if (managedCities && managedCities.length > 0) {
        console.log(`🏙️ Updating manager details in ${managedCities.length} cities`)

        // Update each city
        for (const city of managedCities) {
          const cityUpdateData: any = {}

          if (city.manager1_user_id === body.user_id) {
            cityUpdateData.manager1_name = finalFullName
            cityUpdateData.manager1_phone = finalPhone || null
          }
          if (city.manager2_user_id === body.user_id) {
            cityUpdateData.manager2_name = finalFullName
            cityUpdateData.manager2_phone = finalPhone || null
          }

          if (Object.keys(cityUpdateData).length > 0) {
            await supabase
              .from('cities')
              .update(cityUpdateData)
              .eq('id', city.id)
          }
        }

        console.log('✅ Manager details updated in all managed cities')
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
