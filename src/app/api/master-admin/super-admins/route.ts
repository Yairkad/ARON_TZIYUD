import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase-server'

const MASTER_SESSION_COOKIE = 'master_admin_session'
const SESSION_DURATION = 60 * 60 * 1000 // 1 hour

// Validate session token
function isValidSession(token: string | undefined): boolean {
  if (!token) return false

  const parts = token.split('_')
  if (parts.length !== 3 || parts[0] !== 'master') return false

  const timestamp = parseInt(parts[1])
  if (isNaN(timestamp)) return false

  return Date.now() - timestamp < SESSION_DURATION
}

// Middleware to check master admin authentication
async function checkMasterAuth(): Promise<boolean> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(MASTER_SESSION_COOKIE)?.value
  return isValidSession(sessionToken)
}

// GET - List all super admins from public.users table
export async function GET(request: NextRequest) {
  try {
    const isAuth = await checkMasterAuth()
    if (!isAuth) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    const supabase = createServiceClient()

    // Get super admins from public.users table
    const { data: superAdmins, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'super_admin')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fetch users error:', error)
      return NextResponse.json({ error: 'שגיאה בטעינת הנתונים' }, { status: 500 })
    }

    // Transform to expected format
    const admins = (superAdmins || []).map(user => ({
      id: user.id,
      email: user.email,
      full_name: user.full_name || '',
      phone: user.phone || null,
      permissions: user.permissions || 'full_access',
      is_active: user.is_active,
      created_at: user.created_at,
    }))

    console.log('Super admins found:', admins.length)
    return NextResponse.json({ success: true, admins })
  } catch (error) {
    console.error('GET error:', error)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}

// POST - Create new super admin in Supabase Auth
export async function POST(request: NextRequest) {
  try {
    if (!await checkMasterAuth()) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    const { email, password, full_name, phone, permissions } = await request.json()

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'חסרים שדות חובה' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'הסיסמה חייבת להכיל לפחות 6 תווים' }, { status: 400 })
    }

    // Validate permissions value
    const validPermissions = ['view_only', 'approve_requests', 'full_access']
    const userPermissions = validPermissions.includes(permissions) ? permissions : 'full_access'

    const supabase = createServiceClient()

    // Create user in Supabase Auth with super_admin role
    const { data, error } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        phone: phone || null,
        role: 'super_admin',
        permissions: userPermissions,
        email_verified: true,
      },
    })

    if (error) {
      console.error('Create super admin error:', error)
      if (error.message.includes('already been registered')) {
        return NextResponse.json({ error: 'כתובת המייל כבר קיימת במערכת' }, { status: 400 })
      }
      return NextResponse.json({ error: 'שגיאה ביצירת המשתמש' }, { status: 500 })
    }

    // Also create in public.users table for consistency
    const { error: usersError } = await supabase
      .from('users')
      .insert({
        id: data.user.id,
        email: email.toLowerCase(),
        full_name,
        phone: phone || null,
        role: 'super_admin',
        permissions: userPermissions,
        is_active: true,
      })

    if (usersError) {
      console.error('Failed to create user in public.users:', usersError)
      // Don't fail - the auth user was created successfully
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: data.user.id,
        email: data.user.email,
        full_name,
        phone: phone || null,
        permissions: userPermissions,
        is_active: true,
        created_at: data.user.created_at,
      }
    })
  } catch (error) {
    console.error('POST error:', error)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}

// PUT - Update super admin in Supabase Auth
export async function PUT(request: NextRequest) {
  try {
    if (!await checkMasterAuth()) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    const { id, email, password, full_name, phone, permissions, is_active } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'מזהה משתמש חסר' }, { status: 400 })
    }

    // Validate permissions value if provided
    const validPermissions = ['view_only', 'approve_requests', 'full_access']

    const supabase = createServiceClient()

    // First get the current user to verify it's a super_admin
    const { data: { user: currentUser }, error: getUserError } = await supabase.auth.admin.getUserById(id)

    if (getUserError || !currentUser) {
      return NextResponse.json({ error: 'המשתמש לא נמצא' }, { status: 404 })
    }

    if (currentUser.user_metadata?.role !== 'super_admin') {
      return NextResponse.json({ error: 'המשתמש אינו סופר-אדמין' }, { status: 400 })
    }

    // Build update object
    const updateData: any = {
      user_metadata: { ...currentUser.user_metadata },
    }

    if (email) {
      updateData.email = email.toLowerCase()
    }

    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: 'הסיסמה חייבת להכיל לפחות 6 תווים' }, { status: 400 })
      }
      updateData.password = password
    }

    if (full_name) {
      updateData.user_metadata.full_name = full_name
    }

    if (phone !== undefined) {
      updateData.user_metadata.phone = phone || null
    }

    if (permissions && validPermissions.includes(permissions)) {
      updateData.user_metadata.permissions = permissions
    }

    // Handle blocking/unblocking
    if (is_active !== undefined) {
      if (!is_active) {
        // Ban user for 100 years (effectively permanent)
        updateData.ban_duration = '876000h' // ~100 years
      } else {
        // Unban user
        updateData.ban_duration = 'none'
      }
    }

    const { data, error } = await supabase.auth.admin.updateUserById(id, updateData)

    if (error) {
      console.error('Update super admin error:', error)
      if (error.message.includes('already been registered')) {
        return NextResponse.json({ error: 'כתובת המייל כבר קיימת במערכת' }, { status: 400 })
      }
      return NextResponse.json({ error: 'שגיאה בעדכון המשתמש' }, { status: 500 })
    }

    // Also update in public.users table (or create if doesn't exist)
    const { data: existingUserRecord } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .single()

    if (existingUserRecord) {
      // Update existing record
      const usersUpdateData: any = { updated_at: new Date().toISOString() }
      if (email) usersUpdateData.email = email.toLowerCase()
      if (full_name) usersUpdateData.full_name = full_name
      if (phone !== undefined) usersUpdateData.phone = phone || null
      if (permissions && validPermissions.includes(permissions)) usersUpdateData.permissions = permissions
      if (is_active !== undefined) usersUpdateData.is_active = is_active

      const { error: usersError } = await supabase
        .from('users')
        .update(usersUpdateData)
        .eq('id', id)

      if (usersError) {
        console.error('Failed to update user in public.users:', usersError)
      }
    } else {
      // Create new record in users table (for users created before the fix)
      const { error: usersError } = await supabase
        .from('users')
        .insert({
          id: id,
          email: data.user.email?.toLowerCase() || '',
          full_name: data.user.user_metadata?.full_name || '',
          phone: data.user.user_metadata?.phone || null,
          role: 'super_admin',
          permissions: data.user.user_metadata?.permissions || 'full_access',
          is_active: !(data.user as any).banned_until,
        })

      if (usersError) {
        console.error('Failed to create user in public.users:', usersError)
      } else {
        console.log('Created missing user record in public.users for:', id)
      }
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || '',
        phone: data.user.user_metadata?.phone || null,
        permissions: data.user.user_metadata?.permissions || 'full_access',
        is_active: !(data.user as any).banned_until,
        created_at: data.user.created_at,
      }
    })
  } catch (error) {
    console.error('PUT error:', error)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}

// DELETE - Delete super admin from Supabase Auth
export async function DELETE(request: NextRequest) {
  try {
    if (!await checkMasterAuth()) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'מזהה משתמש חסר' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // List all users to count super admins
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const superAdminCount = users.filter(u => u.user_metadata?.role === 'super_admin').length

    if (superAdminCount <= 1) {
      return NextResponse.json({ error: 'לא ניתן למחוק את הסופר-אדמין האחרון' }, { status: 400 })
    }

    // Verify the user is a super_admin before deleting
    const { data: { user: targetUser } } = await supabase.auth.admin.getUserById(id)

    if (!targetUser || targetUser.user_metadata?.role !== 'super_admin') {
      return NextResponse.json({ error: 'המשתמש אינו סופר-אדמין' }, { status: 400 })
    }

    const { error } = await supabase.auth.admin.deleteUser(id)

    if (error) {
      console.error('Delete super admin error:', error)
      return NextResponse.json({ error: 'שגיאה במחיקת המשתמש' }, { status: 500 })
    }

    // Also delete from public.users table
    const { error: usersError } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (usersError) {
      console.error('Failed to delete user from public.users:', usersError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE error:', error)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}
