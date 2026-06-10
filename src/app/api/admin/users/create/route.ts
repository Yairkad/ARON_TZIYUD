/**
 * API Route: Create New User
 * POST /api/admin/users/create
 *
 * Creates a new user in Supabase Auth and links to city
 * Only accessible by super_admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { logEmail, sendWelcomeEmail } from '@/lib/email'
import crypto from 'crypto'

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

    // No slot limit — any number of managers can be assigned to a city

    // Create user in Supabase Auth
    console.log('Creating user with data:', {
      email: body.email,
      role: body.role,
      city_id: body.city_id,
      permissions: permissions,
      manager_role: body.manager_role,
    })

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
      console.error('Full error details:', JSON.stringify(createError, null, 2))
      return NextResponse.json(
        { success: false, error: `שגיאה ביצירת משתמש: ${createError?.message || 'Unknown error'}` },
        { status: 500 }
      )
    }

    // The trigger will automatically create the user in public.users table
    // But let's verify it was created
    await new Promise(resolve => setTimeout(resolve, 500)) // Wait for trigger

    let newUserProfile = null
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError) {
      console.error('User created in Auth but not in users table, creating manually:', profileError)

      // FALLBACK: Create user manually in public.users if trigger failed
      const { data: manualProfile, error: manualError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: body.email,
          full_name: body.full_name,
          role: body.role,
          city_id: body.city_id || null,
          permissions: permissions,
          phone: body.phone || null,
          manager_role: body.manager_role || null,
          is_active: true,
        })
        .select()
        .single()

      if (manualError) {
        console.error('Failed to create user manually:', manualError)
        console.error('Manual error details:', JSON.stringify(manualError, null, 2))
        console.error('Attempted to insert:', {
          id: authData.user.id,
          email: body.email,
          full_name: body.full_name,
          role: body.role,
          city_id: body.city_id || null,
          permissions: permissions,
          phone: body.phone || null,
          manager_role: body.manager_role || null,
          is_active: true,
        })
        // Try to clean up
        await supabase.auth.admin.deleteUser(authData.user.id)
        return NextResponse.json(
          { success: false, error: `שגיאה ביצירת פרופיל משתמש: ${manualError.message || 'Unknown error'}` },
          { status: 500 }
        )
      }

      newUserProfile = manualProfile
    } else {
      newUserProfile = profileData
    }

    // Register assignment in junction table + update display columns on cities
    if (body.role === 'city_manager' && body.city_id) {
      const { error: assignError } = await supabase
        .from('city_manager_assignments')
        .upsert(
          {
            city_id: body.city_id,
            user_id: authData.user.id,
            display_role: body.manager_role || 'manager1',
          },
          { onConflict: 'city_id,user_id' }
        )

      if (assignError) {
        console.error('Error inserting city_manager_assignment:', assignError)
      }

      // Keep display columns in sync for existing manager1/manager2 slots
      if (body.manager_role === 'manager1' || body.manager_role === 'manager2') {
        const displayUpdate: any =
          body.manager_role === 'manager1'
            ? { manager1_user_id: authData.user.id, manager1_name: body.full_name, manager1_phone: body.phone || null }
            : { manager2_user_id: authData.user.id, manager2_name: body.full_name, manager2_phone: body.phone || null }

        const { error: cityUpdateError } = await supabase
          .from('cities')
          .update(displayUpdate)
          .eq('id', body.city_id)

        if (cityUpdateError) {
          console.error('Error updating city display columns:', cityUpdateError)
        }
      }
    }

    // Get city name for welcome email
    let cityName = 'המערכת'
    if (body.city_id) {
      const { data: cityData } = await supabase
        .from('cities')
        .select('name')
        .eq('id', body.city_id)
        .single()
      cityName = cityData?.name || 'המערכת'
    }

    // Generate reset token for welcome email
    const resetToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1) // 1 hour expiration

    // Store reset token in city_managers table if applicable
    const { data: cityManager } = await supabase
      .from('city_managers')
      .select('id')
      .eq('email', body.email)
      .single()

    if (cityManager) {
      await supabase
        .from('city_managers')
        .update({
          reset_token: resetToken,
          reset_token_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', cityManager.id)
    }

    // Send welcome email with reset link via Gmail SMTP
    const emailResult = await sendWelcomeEmail(
      body.email,
      resetToken,
      body.full_name,
      cityName
    )

    // Log the email
    await logEmail({
      recipientEmail: body.email,
      recipientName: body.full_name,
      emailType: 'welcome',
      subject: `🎉 ברוך הבא למערכת ארון הציוד - ${cityName}`,
      status: emailResult.success ? 'sent' : 'failed',
      errorMessage: emailResult.error,
      sentBy: adminUser?.email || 'system',
      metadata: {
        user_id: authData.user.id,
        city_id: body.city_id || null,
        city_name: cityName,
        role: body.role,
        manager_role: body.manager_role || null,
        created_by: adminUser?.full_name || adminUser?.email || 'System'
      }
    })

    if (!emailResult.success) {
      console.error('Error sending welcome email:', emailResult.error)
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
          email_sent: emailResult.success,
        },
      })

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
      emailSent: emailResult.success,
    })

  } catch (error) {
    console.error('Error in create user API:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאת שרת פנימית' },
      { status: 500 }
    )
  }
}
