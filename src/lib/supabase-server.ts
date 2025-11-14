/**
 * Supabase Server-Side Client
 * Used for API routes and server-side operations that require authentication
 */

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

/**
 * Legacy: Client עם Service Role Key - עוקף RLS
 * @deprecated Use createServiceClient() instead
 */
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * Create a Supabase client for use in Server Components
 * This client respects the user's authentication state from cookies
 */
export async function createServerClient() {
  const cookieStore = await cookies()

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        cookie: cookieStore
          .getAll()
          .map(({ name, value }) => `${name}=${value}`)
          .join('; '),
      },
    },
  })
}

/**
 * Create a Supabase client with Service Role privileges
 * WARNING: Only use this for admin operations! Has full database access and bypasses RLS.
 * Never expose service role key to the client!
 */
export function createServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

/**
 * Get the current authenticated user from the session
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
  const supabase = await createServerClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

/**
 * Get the current user's profile with role and city information
 * Returns null if not authenticated
 *
 * This function reads the access token from cookies and uses it to get the user.
 * It works in both Server Components (via cookies()) and API Routes (via request.cookies)
 */
export async function getCurrentUserProfile(accessToken?: string) {
  try {
    // If no access token provided, try to get it from cookies() (Server Components)
    if (!accessToken) {
      try {
        const cookieStore = await cookies()
        accessToken = cookieStore.get('sb-access-token')?.value
      } catch (e) {
        // cookies() doesn't work in API routes, accessToken must be provided
        console.error('getCurrentUserProfile - cookies() not available, accessToken must be provided')
        return null
      }
    }

    if (!accessToken) {
      console.log('getCurrentUserProfile - No access token found')
      return null
    }

    // Create a service client to query the user
    const supabase = createServiceClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken)

    if (authError) {
      console.error('getCurrentUserProfile - Auth error:', authError.message)
      return null
    }

    if (!user) {
      console.log('getCurrentUserProfile - No user found in session')
      return null
    }

    console.log('getCurrentUserProfile - User found:', user.id, user.email)

    // Fetch user profile from public.users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*, cities(*)')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('getCurrentUserProfile - Profile error:', profileError.message)
      return null
    }

    if (!profile) {
      console.log('getCurrentUserProfile - No profile found for user:', user.id)
      return null
    }

    console.log('getCurrentUserProfile - Profile found:', profile.email, profile.role)

    return {
      ...user,
      ...profile,
    }
  } catch (error) {
    console.error('getCurrentUserProfile - Exception:', error)
    return null
  }
}

/**
 * Check if the current user is a super admin
 */
export async function isSuperAdmin() {
  const profile = await getCurrentUserProfile()
  return profile?.role === 'super_admin'
}

/**
 * Check if the current user is a city manager for a specific city
 */
export async function isCityManager(cityId: string) {
  const profile = await getCurrentUserProfile()
  return profile?.role === 'city_manager' && profile?.city_id === cityId
}

/**
 * Get the city ID for the current city manager
 * Returns null if user is not a city manager
 */
export async function getUserCityId() {
  const profile = await getCurrentUserProfile()
  return profile?.role === 'city_manager' ? profile?.city_id : null
}
