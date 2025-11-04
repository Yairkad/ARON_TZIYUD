import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'

// Rate limiting למנהל על
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 3 // פחות ניסיונות למנהל על
const LOCKOUT_TIME = 30 * 60 * 1000 // 30 דקות

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json(
        { error: 'נדרשת סיסמה' },
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

    // שליפת סיסמת מנהל על
    const { data, error } = await supabaseServer
      .from('settings')
      .select('value')
      .eq('key', 'super_admin_password')
      .single()

    if (error) {
      console.error('Error fetching super admin password:', error)
      updateAttempts(clientId)
      return NextResponse.json(
        { error: 'שגיאה בטעינת הגדרות' },
        { status: 500 }
      )
    }

    const storedPassword = data?.value || '1234'

    // בדיקת סיסמה - תומך גם בסיסמאות ישנות וגם חדשות
    let isPasswordValid = false

    console.log('[DEBUG] Stored password starts with:', storedPassword.substring(0, 10))
    console.log('[DEBUG] Is encrypted?', storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$'))

    if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$')) {
      // סיסמה מוצפנת
      console.log('[DEBUG] Using bcrypt.compare for encrypted password')
      isPasswordValid = await bcrypt.compare(password, storedPassword)
    } else {
      // סיסמה ישנה בטקסט גלוי
      console.log('[DEBUG] Using plain text comparison')
      isPasswordValid = password === storedPassword

      // אם הסיסמה נכונה, עדכן אותה להצפנה
      if (isPasswordValid) {
        console.log('[DEBUG] Password is valid, attempting to hash and update...')
        const hashedPassword = await bcrypt.hash(password, 10)
        console.log('[DEBUG] Hashed password created:', hashedPassword.substring(0, 20))

        const { error: updateError } = await supabaseServer
          .from('settings')
          .update({ value: hashedPassword })
          .eq('key', 'super_admin_password')

        if (updateError) {
          console.error('[ERROR] Failed to update password:', updateError)
        } else {
          console.log('[SUCCESS] Password successfully updated to hashed version')
        }
      } else {
        console.log('[DEBUG] Password validation failed')
      }
    }

    if (!isPasswordValid) {
      updateAttempts(clientId)
      return NextResponse.json(
        { error: 'סיסמה שגויה' },
        { status: 401 }
      )
    }

    // איפוס ניסיונות כושלים
    loginAttempts.delete(clientId)

    // יצירת session token
    const sessionToken = generateSessionToken('super-admin', 'super')

    // החזרת תגובה עם cookie מאובטח
    const response = NextResponse.json({
      success: true
    })

    response.cookies.set('super_admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 8, // 8 שעות
      path: '/'
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

function generateSessionToken(userId: string, userType: 'city' | 'super'): string {
  const payload = {
    userId,
    userType,
    timestamp: Date.now()
  }
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}
