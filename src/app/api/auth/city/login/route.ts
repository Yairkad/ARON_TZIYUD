import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'

// Rate limiting בסיסי - במציאות כדאי להשתמש בספרייה חיצונית
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 5
const LOCKOUT_TIME = 15 * 60 * 1000 // 15 דקות

export async function POST(request: NextRequest) {
  try {
    const { cityId, password } = await request.json()

    if (!cityId || !password) {
      return NextResponse.json(
        { error: 'נדרש מזהה עיר וסיסמה' },
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
          // Reset after lockout period
          loginAttempts.delete(clientId)
        }
      }
    }

    // שליפת נתוני העיר
    const { data: city, error } = await supabaseServer
      .from('cities')
      .select('id, name, password, is_active')
      .eq('id', cityId)
      .eq('is_active', true)
      .single()

    if (error || !city) {
      // עדכון ניסיונות כושלים
      updateAttempts(clientId)
      return NextResponse.json(
        { error: 'עיר לא נמצאה או לא פעילה' },
        { status: 404 }
      )
    }

    // בדיקת סיסמה - תומך גם בסיסמאות ישנות (plain text) וגם חדשות (hashed)
    let isPasswordValid = false

    if (city.password.startsWith('$2a$') || city.password.startsWith('$2b$')) {
      // סיסמה מוצפנת - השתמש ב-bcrypt
      isPasswordValid = await bcrypt.compare(password, city.password)
    } else {
      // סיסמה ישנה בטקסט גלוי - השווה ישירות
      isPasswordValid = password === city.password

      // אם הסיסמה נכונה, עדכן אותה להצפנה
      if (isPasswordValid) {
        const hashedPassword = await bcrypt.hash(password, 10)
        const { error: updateError } = await supabaseServer
          .from('cities')
          .update({ password: hashedPassword })
          .eq('id', cityId)

        if (updateError) {
          console.error('Error updating password to hashed version:', updateError)
        } else {
          console.log('Password successfully updated to hashed version for city:', cityId)
        }
      }
    }

    if (!isPasswordValid) {
      updateAttempts(clientId)
      return NextResponse.json(
        { error: 'סיסמה שגויה' },
        { status: 401 }
      )
    }

    // איפוס ניסיונות כושלים במקרה של הצלחה
    loginAttempts.delete(clientId)

    // יצירת session token
    const sessionToken = generateSessionToken(city.id, 'city')

    // החזרת תגובה עם cookie מאובטח
    const response = NextResponse.json({
      success: true,
      cityId: city.id,
      cityName: city.name
    })

    // הגדרת cookie מאובטח
    response.cookies.set('city_session', sessionToken, {
      httpOnly: true, // מונע גישה מ-JavaScript בצד הלקוח
      secure: process.env.NODE_ENV === 'production', // רק ב-HTTPS בפרודקשן
      sameSite: 'strict', // הגנה מפני CSRF
      maxAge: 60 * 60 * 8, // 8 שעות
      path: '/'
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
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
  // טוקן פשוט - במציאות כדאי להשתמש ב-JWT
  const payload = {
    userId,
    userType,
    timestamp: Date.now()
  }
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}
