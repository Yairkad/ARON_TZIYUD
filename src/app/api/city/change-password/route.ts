import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'נדרשים כל השדות' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'הסיסמה החדשה חייבת להכיל לפחות 6 תווים' },
        { status: 400 }
      )
    }

    // Check for both authentication methods
    const accessToken = request.cookies.get('sb-access-token')?.value
    const citySession = request.cookies.get('city_session')?.value

    // Case 1: Supabase Auth user (city manager)
    if (accessToken) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        return NextResponse.json(
          { error: 'לא מורשה - נדרשת התחברות' },
          { status: 401 }
        )
      }

      // Get user profile
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('email, is_active')
        .eq('id', user.id)
        .single()

      if (profileError || !userProfile || !userProfile.is_active) {
        return NextResponse.json(
          { error: 'משתמש לא נמצא או לא פעיל' },
          { status: 403 }
        )
      }

      // Verify current password by trying to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userProfile.email,
        password: currentPassword
      })

      if (signInError) {
        return NextResponse.json(
          { error: 'הסיסמה הנוכחית שגויה' },
          { status: 401 }
        )
      }

      // Update password in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        console.error('Error updating password:', updateError)
        return NextResponse.json(
          { error: 'שגיאה בעדכון הסיסמה' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'הסיסמה שונתה בהצלחה'
      })
    }

    // Case 2: City direct login
    if (citySession) {
      // Parse session token
      let sessionData
      try {
        sessionData = JSON.parse(Buffer.from(citySession, 'base64').toString())
      } catch (error) {
        return NextResponse.json(
          { error: 'לא מורשה - נדרשת התחברות' },
          { status: 401 }
        )
      }

      if (sessionData.userType !== 'city') {
        return NextResponse.json(
          { error: 'לא מורשה - נדרשת התחברות' },
          { status: 401 }
        )
      }

      const cityId = sessionData.userId

      // Get city from database
      const { data: city, error: cityError } = await supabase
        .from('cities')
        .select('id, password, is_active')
        .eq('id', cityId)
        .single()

      if (cityError || !city || !city.is_active) {
        return NextResponse.json(
          { error: 'עיר לא נמצאה או לא פעילה' },
          { status: 403 }
        )
      }

      // Verify current password
      let isPasswordValid = false
      if (city.password.startsWith('$2a$') || city.password.startsWith('$2b$')) {
        // Hashed password
        isPasswordValid = await bcrypt.compare(currentPassword, city.password)
      } else {
        // Plain text (legacy)
        isPasswordValid = currentPassword === city.password
      }

      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'הסיסמה הנוכחית שגויה' },
          { status: 401 }
        )
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10)

      // Update city password
      const { error: updateError } = await supabase
        .from('cities')
        .update({ password: hashedPassword })
        .eq('id', cityId)

      if (updateError) {
        console.error('Error updating city password:', updateError)
        return NextResponse.json(
          { error: 'שגיאה בעדכון הסיסמה' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'הסיסמה שונתה בהצלחה'
      })
    }

    // No valid authentication found
    return NextResponse.json(
      { error: 'לא מורשה - נדרשת התחברות' },
      { status: 401 }
    )
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { error: 'שגיאה בתהליך שינוי הסיסמה' },
      { status: 500 }
    )
  }
}
