import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

// Rate limiting למנהל על
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 3 // פחות ניסיונות למנהל על
const LOCKOUT_TIME = 30 * 60 * 1000 // 30 דקות

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'נדרשים מייל וסיסמה' },
        { status: 400 }
      )
    }

    // בדיקת Rate Limiting
    const forwardedFor = request.headers.get('x-forwarded-for')
    const clientId = forwardedFor?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown'
    const attempts = loginAttempts.get(clientId)

    if (attempts) {
      const now = Date.now()
      if (attempts.count >= MAX_ATTEMPTS) {
        if (now - attempts.lastAttempt < LOCKOUT_TIME) {
          const remainingTime = Math.ceil((LOCKOUT_TIME - (now - attempts.lastAttempt)) / 60000)
          return NextResponse.json(
            { error: `נסיונות רבים מדי. נסה שוב בעוד ${remainingTime} דקות` },
            { status: 429 }
          )
        } else {
          loginAttempts.delete(clientId)
        }
      }
    }

    // התחברות עם Supabase Auth
    const supabase = createServiceClient()

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      console.error('Supabase auth error:', authError)
      console.error('Auth error details:', {
        message: authError?.message,
        status: authError?.status,
        name: authError?.name
      })
      updateAttempts(clientId)
      return NextResponse.json(
        { success: false, error: 'מייל או סיסמה שגויים' },
        { status: 401 }
      )
    }

    // בדיקה שהמשתמש הוא super_admin
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role, is_active, full_name')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !userProfile) {
      updateAttempts(clientId)
      return NextResponse.json(
        { success: false, error: 'משתמש לא נמצא' },
        { status: 404 }
      )
    }

    if (userProfile.role !== 'super_admin') {
      updateAttempts(clientId)
      return NextResponse.json(
        { success: false, error: 'אין הרשאות מנהל ראשי' },
        { status: 403 }
      )
    }

    if (!userProfile.is_active) {
      return NextResponse.json(
        { success: false, error: 'חשבון זה הושבת' },
        { status: 403 }
      )
    }

    // איפוס ניסיונות כושלים
    loginAttempts.delete(clientId)

    // עדכון last_login_at
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', authData.user.id)

    // החזרת תגובה עם session
    const response = NextResponse.json({
      success: true,
      user: {
        email: authData.user.email,
        full_name: userProfile.full_name,
      },
    })

    // Set Supabase session cookies
    const sessionCookies = [
      { name: 'sb-access-token', value: authData.session.access_token },
      { name: 'sb-refresh-token', value: authData.session.refresh_token },
    ]

    sessionCookies.forEach(({ name, value }) => {
      response.cookies.set(name, value, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 8, // 8 שעות
        path: '/',
      })
    })

    return response
  } catch (error) {
    console.error('Super admin login error:', error)
    return NextResponse.json(
      { error: 'שגיאה בתהליך ההתחברות' },
      { status: 500 }
    )
  }
}

function updateAttempts(clientId: string) {
  const attempts = loginAttempts.get(clientId) || { count: 0, lastAttempt: 0 }
  attempts.count++
  attempts.lastAttempt = Date.now()
  loginAttempts.set(clientId, attempts)
}
