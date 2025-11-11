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
export function createServerClient() {
  const cookieStore = cookies()

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
  const supabase = createServerClient()

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
 */
export async function getCurrentUserProfile() {
  const supabase = createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  // Fetch user profile from public.users table
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*, cities(*)')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return null
  }

  return {
    ...user,
    ...profile,
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
