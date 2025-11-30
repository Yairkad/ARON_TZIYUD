import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase-server'

// Default password if not set in DB
const DEFAULT_MASTER_PASSWORD = process.env.MASTER_ADMIN_PASSWORD || 'YairMaster2024!'

const MASTER_SESSION_COOKIE = 'master_admin_session'
const SESSION_DURATION = 60 * 60 * 1000 // 1 hour

// Get master password from database or fallback to env/default
async function getMasterPassword(): Promise<string> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'master_admin_password')
      .single()

    if (data?.value) {
      return data.value
    }
  } catch (error) {
    // Table might not exist yet, use default
  }
  return DEFAULT_MASTER_PASSWORD
}

// Simple session token generation
function generateSessionToken(): string {
  return `master_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

// Validate session token
function isValidSession(token: string | undefined): boolean {
  if (!token) return false

  // Token format: master_timestamp_randomstring
  const parts = token.split('_')
  if (parts.length !== 3 || parts[0] !== 'master') return false

  const timestamp = parseInt(parts[1])
  if (isNaN(timestamp)) return false

  // Check if session expired
  return Date.now() - timestamp < SESSION_DURATION
}

// GET - Check if authenticated
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(MASTER_SESSION_COOKIE)?.value

    if (isValidSession(sessionToken)) {
      return NextResponse.json({ success: true, authenticated: true })
    }

    return NextResponse.json({ success: false, authenticated: false }, { status: 401 })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ error: 'שגיאה בבדיקת הרשאות' }, { status: 500 })
  }
}

// POST - Login with master password
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json({ error: 'יש להזין סיסמה' }, { status: 400 })
    }

    const masterPassword = await getMasterPassword()
    if (password !== masterPassword) {
      return NextResponse.json({ error: 'סיסמה שגויה' }, { status: 401 })
    }

    // Create session token
    const sessionToken = generateSessionToken()

    // Set cookie
    const response = NextResponse.json({ success: true })
    response.cookies.set(MASTER_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_DURATION / 1000, // Convert to seconds
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'שגיאה בהתחברות' }, { status: 500 })
  }
}

// PUT - Change master password
export async function PUT(request: NextRequest) {
  try {
    // Check if authenticated
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(MASTER_SESSION_COOKIE)?.value

    if (!isValidSession(sessionToken)) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'יש למלא את כל השדות' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'הסיסמה החדשה חייבת להכיל לפחות 6 תווים' }, { status: 400 })
    }

    // Verify current password
    const masterPassword = await getMasterPassword()
    if (currentPassword !== masterPassword) {
      return NextResponse.json({ error: 'הסיסמה הנוכחית שגויה' }, { status: 401 })
    }

    // Save new password to database
    const supabase = createServiceClient()

    // Try to upsert the password
    const { error } = await supabase
      .from('system_settings')
      .upsert(
        { key: 'master_admin_password', value: newPassword, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )

    if (error) {
      console.error('Error saving password:', error)
      return NextResponse.json({ error: 'שגיאה בשמירת הסיסמה' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json({ error: 'שגיאה בשינוי הסיסמה' }, { status: 500 })
  }
}

// DELETE - Logout
export async function DELETE(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true })
    response.cookies.delete(MASTER_SESSION_COOKIE)
    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'שגיאה בהתנתקות' }, { status: 500 })
  }
}
