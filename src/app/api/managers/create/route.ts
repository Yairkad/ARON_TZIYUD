import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import crypto from 'crypto'

/**
 * POST /api/managers/create
 * Create a new city manager (by super admin only)
 * Creates both auth.users entry and public.users entry
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    // Verify super admin authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'נדרש אימות' },
        { status: 401 }
      )
    }

    // Get current user from session
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !authUser) {
      return NextResponse.json(
        { success: false, error: 'משתמש לא מאומת' },
        { status: 401 }
      )
    }

    // Verify super admin role
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', authUser.id)
      .single()

    if (userError || currentUser?.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'אין הרשאות למבצע פעולה זו' },
        { status: 403 }
      )
    }

    // Get request body
    const { city_id, email, manager_role, full_name, phone } = await request.json()

    // Validate required fields
    if (!city_id || !email || !manager_role || !full_name) {
      return NextResponse.json(
        { success: false, error: 'חסרים שדות חובה' },
        { status: 400 }
      )
    }

    if (!['manager1', 'manager2'].includes(manager_role)) {
      return NextResponse.json(
        { success: false, error: 'תפקיד מנהל לא תקין' },
        { status: 400 }
      )
    }

    // Check if city exists
    const { data: city, error: cityError } = await supabase
      .from('cities')
      .select('id, name')
      .eq('id', city_id)
      .single()

    if (cityError || !city) {
      return NextResponse.json(
        { success: false, error: 'עיר לא נמצאה' },
        { status: 404 }
      )
    }

    // Check if manager role already exists for this city
    const { data: existingManager, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('city_id', city_id)
      .eq('manager_role', manager_role)
      .eq('role', 'city_manager')
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing manager:', checkError)
      return NextResponse.json(
        { success: false, error: 'שגיאה בבדיקת מנהלים קיימים' },
        { status: 500 }
      )
    }

    if (existingManager) {
      return NextResponse.json(
        { success: false, error: `כבר קיים ${manager_role === 'manager1' ? 'מנהל ראשון' : 'מנהל שני'} עבור עיר זו` },
        { status: 400 }
      )
    }

    // Generate temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex')

    // Create user in Supabase Auth
    const { data: newAuthUser, error: createAuthError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: false, // Require email verification
      user_metadata: {
        role: 'city_manager',
        city_id,
        full_name,
        manager_role,
        phone
      }
    })

    if (createAuthError || !newAuthUser.user) {
      console.error('Error creating auth user:', createAuthError)
      return NextResponse.json(
        { success: false, error: createAuthError?.message || 'שגיאה ביצירת משתמש' },
        { status: 500 }
      )
    }

    // The trigger should create the user in public.users automatically
    // But let's verify it was created
    await new Promise(resolve => setTimeout(resolve, 1000)) // Wait for trigger

    const { data: publicUser, error: publicUserError } = await supabase
      .from('users')
      .select('*')
      .eq('id', newAuthUser.user.id)
      .single()

    if (publicUserError) {
      console.error('Error fetching public user:', publicUserError)
      // User was created in auth but not in public.users - try to create manually
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: newAuthUser.user.id,
          email,
          role: 'city_manager',
          city_id,
          full_name,
          manager_role,
          phone,
          is_active: true
        })

      if (insertError) {
        console.error('Error creating public user:', insertError)
        // Rollback - delete auth user
        await supabase.auth.admin.deleteUser(newAuthUser.user.id)
        return NextResponse.json(
          { success: false, error: 'שגיאה ביצירת פרופיל משתמש' },
          { status: 500 }
        )
      }
    }

    // Send welcome email with temporary password
    const { sendWelcomeEmail } = await import('@/lib/email')
    await sendWelcomeEmail(email, tempPassword, full_name, city.name)

    return NextResponse.json({
      success: true,
      message: 'מנהל נוצר בהצלחה. נשלח מייל עם סיסמה זמנית.',
      manager: {
        id: newAuthUser.user.id,
        email,
        full_name,
        manager_role,
        city_name: city.name
      },
      temp_password: tempPassword // Only for development - remove in production
    })

  } catch (error) {
    console.error('Create manager error:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאה ביצירת מנהל' },
      { status: 500 }
    )
  }
}
