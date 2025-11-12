// פונקציות עזר לאימות ו-session management

export interface SessionData {
  userId: string
  userType: 'city' | 'super'
  timestamp: number
}

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

// התחברות עיר
export async function loginCity(cityId: string, password: string): Promise<{ success: boolean; error?: string; cityId?: string; cityName?: string }> {
  try {
    const response = await fetch('/api/auth/city/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ cityId, password })
    })

    const data = await response.json()

    if (response.ok) {
      return { success: true, ...data }
    }

    return { success: false, error: data.error }
  } catch (error) {
    console.error('Login error:', error)
    return { success: false, error: 'שגיאה בתהליך ההתחברות' }
  }
}

// התחברות מנהל על
export async function loginSuperAdmin(email: string, password: string, rememberMe: boolean = false): Promise<{ success: boolean; error?: string; user?: any }> {
  try {
    const response = await fetch('/api/auth/super-admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ email, password, rememberMe })
    })

    const data = await response.json()

    if (response.ok && data.success) {
      return { success: true, user: data.user }
    }

    return { success: false, error: data.error }
  } catch (error) {
    console.error('Super admin login error:', error)
    return { success: false, error: 'שגיאה בתהליך ההתחברות' }
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
