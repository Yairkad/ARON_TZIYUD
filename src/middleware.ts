import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

// UUID regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Handle city slug to UUID resolution
  // Match /city/[slug] or /city/[slug]/admin patterns
  const cityMatch = pathname.match(/^\/city\/([^\/]+)(\/.*)?$/)
  if (cityMatch) {
    const cityIdentifier = decodeURIComponent(cityMatch[1])
    const restOfPath = cityMatch[2] || ''

    // If it's not a UUID, try to resolve slug to UUID
    if (!UUID_REGEX.test(cityIdentifier)) {
      try {
        const supabase = createServiceClient()
        const { data: city } = await supabase
          .from('cities')
          .select('id')
          .eq('slug', cityIdentifier)
          .single()

        if (city) {
          // Rewrite the URL internally to use UUID (browser still shows slug)
          const newUrl = new URL(request.url)
          newUrl.pathname = `/city/${city.id}${restOfPath}`
          return NextResponse.rewrite(newUrl)
        }
        // If slug not found, continue (page will handle 404)
      } catch (error) {
        console.error('Error resolving city slug:', error)
      }
    }
  }

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

    // Set default maxAge based on whether this is a "remember me" session
    // We use 8 hours as default, or 30 days if refresh token exists (indicating remember me)
    const hasRefreshToken = !!refreshToken
    const defaultMaxAge = hasRefreshToken ? 60 * 60 * 24 * 30 : 60 * 60 * 8

    newResponse.cookies.set('sb-access-token', refreshData.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: defaultMaxAge,
      path: '/',
    })

    newResponse.cookies.set('sb-refresh-token', refreshData.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: defaultMaxAge,
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
