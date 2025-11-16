/**
 * API Route: Unified Login
 * POST /api/auth/login
 *
 * Handles login for all user types (super_admin and city_manager)
 * Returns user info and redirect path based on role
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

// Disable caching for this endpoint
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Rate limiting
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 5
const LOCKOUT_TIME = 15 * 60 * 1000 // 15 minutes

export async function POST(request: NextRequest) {
  try {
    const { email, password, rememberMe } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'נדרשים מייל וסיסמה' },
        { status: 400 }
      )
    }

    // Rate limiting check
    const forwardedFor = request.headers.get('x-forwarded-for')
    const clientId = forwardedFor?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown'
    const attempts = loginAttempts.get(clientId)

    if (attempts) {
      const now = Date.now()
      if (attempts.count >= MAX_ATTEMPTS) {
        if (now - attempts.lastAttempt < LOCKOUT_TIME) {
          const remainingTime = Math.ceil((LOCKOUT_TIME - (now - attempts.lastAttempt)) / 60000)
          return NextResponse.json(
            { success: false, error: `נסיונות רבים מדי. נסה שוב בעוד ${remainingTime} דקות` },
            { status: 429 }
          )
        } else {
          loginAttempts.delete(clientId)
        }
      }
    }

    // Authenticate with Supabase
    const supabase = createServiceClient()

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      console.error('Login authentication error:', authError)
      updateAttempts(clientId)
      return NextResponse.json(
        { success: false, error: 'מייל או סיסמה שגויים' },
        { status: 401 }
      )
    }

    // Get user data from public.users table (more reliable than metadata)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, city_id, full_name, is_active')
      .eq('id', authData.user.id)
      .single()

    // Determine user data source - prefer database, fallback to metadata
    let userRole: string | null = null
    let isActive = true
    let fullName = authData.user.email || ''
    let cityId: string | null = null

    if (userError || !userData) {
      console.error('❌ User not found in users table:', userError)
      // Fallback to metadata if user not in public.users
      const userMetadata = authData.user.user_metadata || {}
      userRole = userMetadata.role || null
      isActive = userMetadata.is_active !== false
      fullName = userMetadata.full_name || authData.user.email || ''
      cityId = userMetadata.city_id || null

      if (!userRole) {
        return NextResponse.json(
          { success: false, error: 'משתמש לא נמצא במערכת' },
          { status: 403 }
        )
      }
    } else {
      // Use data from users table
      userRole = userData.role
      isActive = userData.is_active !== false
      fullName = userData.full_name || authData.user.email || ''
      cityId = userData.city_id || null
    }

    console.log('👤 User login:', {
      email: authData.user.email,
      role: userRole,
      isActive: isActive,
      cityId: cityId
    })

    // Check if user is active
    if (!isActive) {
      return NextResponse.json(
        { success: false, error: 'חשבון זה הושבת' },
        { status: 403 }
      )
    }

    // Check if user has a valid role
    if (!userRole || (userRole !== 'super_admin' && userRole !== 'city_manager')) {
      console.error('❌ Invalid user role:', userRole)
      return NextResponse.json(
        { success: false, error: 'אין הרשאות גישה למערכת' },
        { status: 403 }
      )
    }

    // For city managers, verify city_id exists
    if (userRole === 'city_manager' && !cityId) {
      console.error('❌ City manager without city_id')
      return NextResponse.json(
        { success: false, error: 'משתמש לא משויך לעיר' },
        { status: 403 }
      )
    }

    // Clear failed login attempts
    loginAttempts.delete(clientId)

    // Update last login timestamp
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', authData.user.id)

    // Determine redirect path based on role
    let redirectPath = '/'
    if (userRole === 'super_admin') {
      redirectPath = '/super-admin'
    } else if (userRole === 'city_manager') {
      // City managers go to city selection page
      // The select-city page will handle single vs multiple cities
      redirectPath = '/select-city'
    }

    // Create response with user data
    const response = NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name: fullName,
        role: userRole,
        city_id: cityId,
      },
      redirectPath: redirectPath,
    })

    // Add no-cache headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    // Set Supabase session cookies
    const sessionCookies = [
      { name: 'sb-access-token', value: authData.session.access_token },
      { name: 'sb-refresh-token', value: authData.session.refresh_token },
    ]

    // Set cookie duration based on "Remember Me"
    const cookieMaxAge = rememberMe
      ? 60 * 60 * 24 * 30 // 30 days
      : 60 * 60 * 8 // 8 hours

    sessionCookies.forEach(({ name, value }) => {
      response.cookies.set(name, value, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: cookieMaxAge,
        path: '/',
      })
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאה בתהליך ההתחברות' },
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
