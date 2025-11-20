import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// For routes that need user context (uses cookies for auth)
export function createServerClient() {
  return createRouteHandlerClient({ cookies })
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
    supabase = createServerClient()
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
