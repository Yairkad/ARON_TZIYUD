// פונקציות עזר לאימות ו-session management

// בדיקת אימות בצד הלקוח
export async function checkAuth(): Promise<{ authenticated: boolean; userId?: string; userType?: string; cityId?: string; user?: any }> {
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include' // חשוב! שולח cookies
    })

    if (response.ok) {
      const data = await response.json()
      if (data.success && data.user) {
        return {
          authenticated: true,
          userId: data.user.id,
          userType: data.user.role === 'super_admin' ? 'super' : 'city',
          cityId: data.user.city_id || undefined,
          user: data.user
        }
      }
    }

    return { authenticated: false }
  } catch (error) {
    console.error('Auth check error:', error)
    return { authenticated: false }
  }
}

// התנתקות
export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    })
  } catch (error) {
    console.error('Logout error:', error)
  }
}
