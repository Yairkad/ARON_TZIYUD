import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

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

// GET - List all super admins
export async function GET(request: NextRequest) {
  try {
    const isAuth = await checkMasterAuth()
    console.log('Master auth check:', isAuth)

    if (!isAuth) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('managers')
      .select('id, email, full_name, phone, is_active, created_at')
      .eq('role', 'super_admin')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fetch super admins error:', error)
      return NextResponse.json({ error: 'שגיאה בטעינת הנתונים' }, { status: 500 })
    }

    console.log('Super admins found:', data?.length || 0)
    return NextResponse.json({ success: true, admins: data || [] })
  } catch (error) {
    console.error('GET error:', error)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}

// POST - Create new super admin
export async function POST(request: NextRequest) {
  try {
    if (!await checkMasterAuth()) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    const { email, password, full_name, phone } = await request.json()

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'חסרים שדות חובה' }, { status: 400 })
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from('managers')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      return NextResponse.json({ error: 'כתובת המייל כבר קיימת במערכת' }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create super admin
    const { data, error } = await supabase
      .from('managers')
      .insert({
        email: email.toLowerCase(),
        password: hashedPassword,
        full_name,
        phone: phone || null,
        role: 'super_admin',
        permissions: 'full_access',
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Create super admin error:', error)
      return NextResponse.json({ error: 'שגיאה ביצירת המשתמש' }, { status: 500 })
    }

    return NextResponse.json({ success: true, admin: data })
  } catch (error) {
    console.error('POST error:', error)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}

// PUT - Update super admin
export async function PUT(request: NextRequest) {
  try {
    if (!await checkMasterAuth()) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    const { id, email, password, full_name, phone, is_active } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'מזהה משתמש חסר' }, { status: 400 })
    }

    // Build update object
    const updateData: any = {}

    if (email) {
      // Check if email already exists for different user
      const { data: existing } = await supabase
        .from('managers')
        .select('id')
        .eq('email', email.toLowerCase())
        .neq('id', id)
        .single()

      if (existing) {
        return NextResponse.json({ error: 'כתובת המייל כבר קיימת במערכת' }, { status: 400 })
      }

      updateData.email = email.toLowerCase()
    }

    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    if (full_name) {
      updateData.full_name = full_name
    }

    if (phone !== undefined) {
      updateData.phone = phone || null
    }

    if (is_active !== undefined) {
      updateData.is_active = is_active
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'אין נתונים לעדכון' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('managers')
      .update(updateData)
      .eq('id', id)
      .eq('role', 'super_admin')
      .select()
      .single()

    if (error) {
      console.error('Update super admin error:', error)
      return NextResponse.json({ error: 'שגיאה בעדכון המשתמש' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'המשתמש לא נמצא' }, { status: 404 })
    }

    return NextResponse.json({ success: true, admin: data })
  } catch (error) {
    console.error('PUT error:', error)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}

// DELETE - Delete super admin
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

    // Count remaining super admins
    const { count } = await supabase
      .from('managers')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'super_admin')

    if (count && count <= 1) {
      return NextResponse.json({ error: 'לא ניתן למחוק את הסופר-אדמין האחרון' }, { status: 400 })
    }

    const { error } = await supabase
      .from('managers')
      .delete()
      .eq('id', id)
      .eq('role', 'super_admin')

    if (error) {
      console.error('Delete super admin error:', error)
      return NextResponse.json({ error: 'שגיאה במחיקת המשתמש' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE error:', error)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}
