import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable automatic token refresh
    autoRefreshToken: true,
    // Persist session in localStorage
    persistSession: true,
    // Detect session from URL (for magic links, password reset, etc.)
    detectSessionInUrl: true,
    // Storage key for session
    storageKey: 'supabase-auth',
    // Use localStorage for session persistence
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})
