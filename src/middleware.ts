import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Get tokens from cookies
  const accessToken = request.cookies.get('sb-access-token')?.value
  const refreshToken = request.cookies.get('sb-refresh-token')?.value

  // If no tokens, continue (auth will be handled by pages)
  if (!accessToken || !refreshToken) {
    return response
  }

  try {
    const supabase = createServiceClient()

    // Try to get current session
    const { data: { session }, error } = await supabase.auth.getSession()

    // If session is valid, continue
    if (session && !error) {
      return response
    }

    // If session expired, try to refresh using refresh token
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    })

    if (refreshError || !refreshData.session) {
      // Refresh failed - clear cookies and redirect to login
      const redirectResponse = NextResponse.redirect(new URL('/login', request.url))
      redirectResponse.cookies.delete('sb-access-token')
      redirectResponse.cookies.delete('sb-refresh-token')
      return redirectResponse
    }

    // Refresh successful - update cookies with new tokens
    const newResponse = NextResponse.next()

    // Keep the same maxAge as the original cookies
    const accessTokenMaxAge = request.cookies.get('sb-access-token')?.maxAge || 60 * 60 * 8
    const refreshTokenMaxAge = request.cookies.get('sb-refresh-token')?.maxAge || 60 * 60 * 24 * 30

    newResponse.cookies.set('sb-access-token', refreshData.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: accessTokenMaxAge,
      path: '/',
    })

    newResponse.cookies.set('sb-refresh-token', refreshData.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: refreshTokenMaxAge,
      path: '/',
    })

    return newResponse
  } catch (error) {
    console.error('Middleware auth error:', error)
    return response
  }
}

// Only run middleware on protected routes
export const config = {
  matcher: [
    '/super-admin/:path*',
    '/city/:path*',
    '/select-city',
    '/api/city/:path*',
    '/api/super-admin/:path*',
    '/api/admin/:path*',
  ],
}
