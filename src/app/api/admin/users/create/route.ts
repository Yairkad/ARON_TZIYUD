/**
 * API Route: Create New User
 * POST /api/admin/users/create
 *
 * Creates a new user in Supabase Auth and links to city
 * Only accessible by super_admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

interface CreateUserBody {
  email: string
  password: string
  full_name: string
  role: 'city_manager' | 'super_admin'
  city_id?: string
  permissions?: 'view_only' | 'approve_requests' | 'full_access'
  phone?: string
  manager_role?: 'manager1' | 'manager2'
}

export async function POST(request: NextRequest) {
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
    const body: CreateUserBody = await request.json()

    // Validation
    if (!body.email || !body.password || !body.full_name || !body.role) {
      return NextResponse.json(
        { success: false, error: 'חסרים שדות חובה: email, password, full_name, role' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { success: false, error: 'כתובת מייל לא תקינה' },
        { status: 400 }
      )
    }

    // Validate city manager has city_id
    if (body.role === 'city_manager' && !body.city_id) {
      return NextResponse.json(
        { success: false, error: 'מנהל עיר חייב להיות משויך לעיר (city_id)' },
        { status: 400 }
      )
    }

    // Validate super admin doesn't have city_id
    if (body.role === 'super_admin' && body.city_id) {
      return NextResponse.json(
        { success: false, error: 'מנהל ראשי לא יכול להיות משויך לעיר' },
        { status: 400 }
      )
    }

    // Set default permissions
    const permissions = body.role === 'super_admin'
      ? 'full_access'
      : (body.permissions || 'full_access')

    // Create Supabase service client (bypasses RLS)
    const supabase = createServiceClient()

    // Check if city exists (if city_manager)
    if (body.role === 'city_manager' && body.city_id) {
      const { data: city, error: cityError } = await supabase
        .from('cities')
        .select('id, name')
        .eq('id', body.city_id)
        .single()

      if (cityError || !city) {
        return NextResponse.json(
          { success: false, error: 'העיר לא נמצאה במערכת' },
          { status: 404 }
        )
      }
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', body.email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'משתמש עם כתובת מייל זו כבר קיים' },
        { status: 409 }
      )
    }

    // Validate manager_role for city_manager
    if (body.role === 'city_manager' && body.manager_role) {
      // Check if this manager_role already exists for this city
      const { data: existingManager } = await supabase
        .from('users')
        .select('id')
        .eq('city_id', body.city_id)
        .eq('manager_role', body.manager_role)
        .eq('role', 'city_manager')
        .single()

      if (existingManager) {
        return NextResponse.json(
          { success: false, error: `כבר קיים ${body.manager_role === 'manager1' ? 'מנהל ראשון' : 'מנהל שני'} עבור עיר זו` },
          { status: 409 }
        )
      }
    }

    // Create user in Supabase Auth
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: body.full_name,
        role: body.role,
        city_id: body.city_id,
        permissions: permissions,
        phone: body.phone,
        manager_role: body.manager_role,
      },
    })

    if (createError || !authData.user) {
      console.error('Error creating user in Auth:', createError)
      return NextResponse.json(
        { success: false, error: `שגיאה ביצירת משתמש: ${createError?.message}` },
        { status: 500 }
      )
    }

    // The trigger will automatically create the user in public.users table
    // But let's verify it was created
    await new Promise(resolve => setTimeout(resolve, 500)) // Wait for trigger

    const { data: newUserProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError) {
      console.error('User created in Auth but not in users table:', profileError)
      // Try to clean up
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { success: false, error: 'שגיאה ביצירת פרופיל משתמש' },
        { status: 500 }
      )
    }

    // Update city manager details if this is a city manager with manager_role
    if (body.role === 'city_manager' && body.manager_role && body.city_id) {
      const updateData: any = {}

      if (body.manager_role === 'manager1') {
        updateData.manager1_name = body.full_name
        updateData.manager1_phone = body.phone || null
      } else if (body.manager_role === 'manager2') {
        updateData.manager2_name = body.full_name
        updateData.manager2_phone = body.phone || null
      }

      const { error: cityUpdateError } = await supabase
        .from('cities')
        .update(updateData)
        .eq('id', body.city_id)

      if (cityUpdateError) {
        console.error('Error updating city manager details:', cityUpdateError)
        // Don't fail the user creation, just log the error
      }
    }

    // Log the activity
    await supabase
      .from('activity_logs')
      .insert({
        city_id: body.city_id || null,
        manager_name: adminUser?.full_name || adminUser?.email || 'System',
        action: 'user_created',
        details: {
          created_user_email: body.email,
          created_user_role: body.role,
          created_user_permissions: permissions,
        },
      })

    // Send welcome email to the new user
    try {
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/welcome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: body.email,
          name: body.full_name,
          password: body.password,
          role: body.role,
        }),
      })

      if (!emailResponse.ok) {
        console.error('Failed to send welcome email:', await emailResponse.text())
      }
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError)
      // Don't fail the user creation if email fails
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name: newUserProfile.full_name,
        role: newUserProfile.role,
        city_id: newUserProfile.city_id,
        permissions: newUserProfile.permissions,
        is_active: newUserProfile.is_active,
      },
    })

  } catch (error) {
    console.error('Error in create user API:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאת שרת פנימית' },
      { status: 500 }
    )
  }
}
