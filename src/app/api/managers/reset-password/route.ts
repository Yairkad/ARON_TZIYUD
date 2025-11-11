import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

/**
 * POST /api/managers/reset-password
 * Request password reset or reset with token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Case 1: Request password reset (send email)
    if (body.email && !body.token) {
      const { email } = body

      // Find manager by email
      const { data: manager, error: fetchError } = await supabase
        .from('city_managers')
        .select('*')
        .eq('email', email)
        .single()

      if (fetchError || !manager) {
        // Don't reveal if email exists or not (security)
        return NextResponse.json({
          success: true,
          message: 'אם המייל קיים במערכת, נשלח אליו קישור לאיפוס סיסמה'
        })
      }

      // Check if email is verified
      if (!manager.email_verified) {
        return NextResponse.json(
          { success: false, error: 'יש לאמת את המייל לפני איפוס סיסמה' },
          { status: 400 }
        )
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 1) // 1 hour

      // Update manager with reset token
      const { error: updateError } = await supabase
        .from('city_managers')
        .update({
          reset_token: resetToken,
          reset_token_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', manager.id)

      if (updateError) {
        console.error('Error creating reset token:', updateError)
        return NextResponse.json(
          { success: false, error: 'שגיאה ביצירת קישור איפוס' },
          { status: 500 }
        )
      }

      // Send password reset email
      const { sendPasswordResetEmail } = await import('@/lib/email')
      await sendPasswordResetEmail(manager.email, resetToken, manager.name)

      return NextResponse.json({
        success: true,
        message: 'קישור לאיפוס סיסמה נשלח למייל'
      })
    }

    // Case 2: Reset password with token
    if (body.token && body.newPassword) {
      const { token, newPassword } = body

      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: 'הסיסמה חייבת להכיל לפחות 6 תווים' },
          { status: 400 }
        )
      }

      // Find manager with this reset token
      const { data: manager, error: fetchError } = await supabase
        .from('city_managers')
        .select('*')
        .eq('reset_token', token)
        .single()

      if (fetchError || !manager) {
        return NextResponse.json(
          { success: false, error: 'טוקן איפוס לא תקין' },
          { status: 400 }
        )
      }

      // Check if token expired
      if (manager.reset_token_expires_at) {
        const expiresAt = new Date(manager.reset_token_expires_at)
        if (expiresAt < new Date()) {
          return NextResponse.json(
            { success: false, error: 'טוקן האיפוס פג תוקף. אנא בקש טוקן חדש.' },
            { status: 400 }
          )
        }
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 10)

      // Update password and clear reset token
      const { error: updateError } = await supabase
        .from('city_managers')
        .update({
          password_hash: passwordHash,
          reset_token: null,
          reset_token_expires_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', manager.id)

      if (updateError) {
        console.error('Error resetting password:', updateError)
        return NextResponse.json(
          { success: false, error: 'שגיאה באיפוס הסיסמה' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'הסיסמה אופסה בהצלחה! כעת תוכל להתחבר עם הסיסמה החדשה.'
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
