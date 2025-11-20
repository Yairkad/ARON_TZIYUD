import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// For routes that need user context (uses cookies for auth)
export async function createServerClient() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()

  const authCookie = allCookies.find(cookie =>
    cookie.name.includes('auth-token') && cookie.name.startsWith('sb-')
  )

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    authCookie ? {
      global: {
        headers: {
          Authorization: `Bearer ${authCookie.value}`
        }
      }
    } : {}
  )
}

// For routes that need service role access (admin operations)
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Legacy export for backwards compatibility
export const supabaseServer = createServiceClient()

// Helper to get current user profile
export async function getCurrentUserProfile(accessToken?: string) {
  let supabase

  if (accessToken) {
    // Use access token for authentication (middleware pattern)
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      }
    )
  } else {
    // Use cookies for authentication (route handler pattern)
    supabase = await createServerClient()
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return userData
}
