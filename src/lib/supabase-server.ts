import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export function createServerClient() {
  const cookieStore = cookies()
  return createRouteHandlerClient({ cookies: () => cookieStore })
}
