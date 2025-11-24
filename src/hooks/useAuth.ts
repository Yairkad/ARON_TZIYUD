import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

/**
 * Custom hook to manage authentication state
 * Automatically refreshes auth state on page visibility changes
 * This fixes the issue where "back" navigation shows stale logged-out state
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    } catch (error) {
      console.error('Error checking auth:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Initial check
    checkAuth()

    // Re-check when page becomes visible (fixes back navigation)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAuth()
      }
    }

    // Re-check when window gets focus
    const handleFocus = () => {
      checkAuth()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('✅ Token refreshed automatically')
      }
      if (event === 'SIGNED_OUT') {
        console.log('🚪 User signed out')
      }
      setUser(session?.user ?? null)
    })

    // Set up interval to check and refresh token every 50 minutes
    // (Supabase tokens expire after 1 hour by default)
    const refreshInterval = setInterval(async () => {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (session && !error) {
        // Check if token will expire soon (within 10 minutes)
        const expiresAt = session.expires_at
        const now = Math.floor(Date.now() / 1000)
        const timeUntilExpiry = expiresAt ? expiresAt - now : 0

        if (timeUntilExpiry < 600) { // Less than 10 minutes
          console.log('🔄 Refreshing token proactively...')
          const { error: refreshError } = await supabase.auth.refreshSession()
          if (refreshError) {
            console.error('❌ Failed to refresh token:', refreshError)
          }
        }
      }
    }, 50 * 60 * 1000) // Check every 50 minutes

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      subscription.unsubscribe()
      clearInterval(refreshInterval)
    }
  }, [])

  return { user, loading }
}
