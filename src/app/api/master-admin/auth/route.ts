import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Master password - should be set as environment variable in production
const MASTER_PASSWORD = process.env.MASTER_ADMIN_PASSWORD || 'YairMaster2024!'

const MASTER_SESSION_COOKIE = 'master_admin_session'
const SESSION_DURATION = 60 * 60 * 1000 // 1 hour

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

    if (password !== MASTER_PASSWORD) {
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
