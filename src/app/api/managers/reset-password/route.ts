import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import crypto from 'crypto'

/**
 * POST /api/managers/reset-password
 * Request password reset or reset with token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createServiceClient()

    // Case 1: Request password reset (send email)
    if (body.email && !body.token) {
      const { email } = body
      const emailLower = email.toLowerCase().trim()

      // Find user by email in users table
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', emailLower)
        .single()

      if (fetchError || !user) {
        // Don't reveal if email exists or not (security)
        return NextResponse.json({
          success: true,
          message: 'אם המייל קיים במערכת, נשלח אליו קישור לאיפוס סיסמה'
        })
      }

      // Check if user is active
      if (!user.is_active) {
        return NextResponse.json({
          success: true,
          message: 'אם המייל קיים במערכת, נשלח אליו קישור לאיפוס סיסמה'
        })
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 1) // 1 hour

      // Update user with reset token
      console.log('📝 Saving reset token for user:', user.id, 'token:', resetToken.substring(0, 10) + '...')

      const { data: updateData, error: updateError } = await supabase
        .from('users')
        .update({
          reset_token: resetToken,
          reset_token_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select('reset_token')
        .single()

      if (updateError) {
        console.error('❌ Error saving reset token:', updateError)
        return NextResponse.json(
          { success: false, error: 'שגיאה ביצירת קישור איפוס' },
          { status: 500 }
        )
      }

      console.log('✅ Token saved successfully:', updateData?.reset_token ? 'yes' : 'no')

      // Send password reset email
      const { sendPasswordResetEmail } = await import('@/lib/email')
      await sendPasswordResetEmail(user.email, resetToken, user.full_name || 'משתמש')

      return NextResponse.json({
        success: true,
        message: 'קישור לאיפוס סיסמה נשלח למייל'
      })
    }

    // Case 2: Reset password with token
    if (body.token && body.newPassword) {
      const { token, newPassword } = body

      console.log('🔑 Password reset attempt with token:', token.substring(0, 10) + '...')

      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: 'הסיסמה חייבת להכיל לפחות 6 תווים' },
          { status: 400 }
        )
      }

      // Find user with this reset token
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('reset_token', token)
        .single()

      console.log('🔍 Token lookup result:', {
        found: !!user,
        error: fetchError?.message,
        errorCode: fetchError?.code,
        userId: user?.id
      })

      if (fetchError || !user) {
        console.error('❌ Token not found in database. Error:', fetchError)
        return NextResponse.json(
          { success: false, error: 'טוקן איפוס לא תקין. ייתכן שפג תוקפו או שכבר נעשה בו שימוש.' },
          { status: 400 }
        )
      }

      // Check if token expired
      if (user.reset_token_expires_at) {
        const expiresAt = new Date(user.reset_token_expires_at)
        if (expiresAt < new Date()) {
          return NextResponse.json(
            { success: false, error: 'טוקן האיפוס פג תוקף. אנא בקש טוקן חדש.' },
            { status: 400 }
          )
        }
      }

      // Update password in Supabase Auth
      const { error: authError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
      )

      if (authError) {
        console.error('Error updating auth password:', authError)
        return NextResponse.json(
          { success: false, error: 'שגיאה באיפוס הסיסמה' },
          { status: 500 }
        )
      }

      // Clear reset token from users table
      const { error: updateError } = await supabase
        .from('users')
        .update({
          reset_token: null,
          reset_token_expires_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error clearing reset token:', updateError)
      }

      console.log('Password reset successful for user:', { id: user.id, email: user.email, role: user.role, city_id: user.city_id })

      return NextResponse.json({
        success: true,
        message: 'הסיסמה אופסה בהצלחה!',
        user: {
          email: user.email,
          role: user.role,
          city_id: user.city_id
        }
      })
    }

    return NextResponse.json(
      { success: false, error: 'פרמטרים חסרים' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאה באיפוס סיסמה' },
      { status: 500 }
    )
  }
}
