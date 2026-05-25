import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// For routes that need user context (uses cookies for auth)
export async function createServerClient() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()

  const accessTokenCookie = allCookies.find(cookie => cookie.name === 'sb-access-token')
  const accessToken = accessTokenCookie?.value

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    accessToken ? {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
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
  const serviceClient = createServiceClient()

  let userId: string | null = null

  if (accessToken) {
    // Validate the JWT explicitly using the service client
    const { data: { user }, error } = await serviceClient.auth.getUser(accessToken)
    if (error || !user) return null
    userId = user.id
  } else {
    // Fall back to cookies
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    userId = user.id
  }

  const { data: userData } = await serviceClient
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  return userData
}
