import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createServiceClient } from '@/lib/supabase-server'
import crypto from 'crypto'

/**
 * POST /api/managers/resend-verification
 * Resend email verification link to current manager
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseServer = createServiceClient()

    // Get access token from cookies
    const accessToken = request.cookies.get('sb-access-token')?.value

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'נדרשת התחברות' },
        { status: 401 }
      )
    }

    // Get user from token
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(accessToken)

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'נדרשת התחברות' },
        { status: 401 }
      )
    }

    // Try to find manager by auth user ID first, then by email
    let manager
    let fetchError

    const managerByAuth = await supabase
      .from('city_managers')
      .select('*')
      .eq('id', user.id)
      .single()

    if (managerByAuth.data) {
      manager = managerByAuth.data
    } else {
      const managerByEmail = await supabase
        .from('city_managers')
        .select('*')
        .eq('email', user.email)
        .single()

      manager = managerByEmail.data
      fetchError = managerByEmail.error
    }

    if (fetchError || !manager) {
      return NextResponse.json(
        { success: false, error: 'מנהל לא נמצא' },
        { status: 404 }
      )
    }

    // Check if already verified
    if (manager.email_verified) {
      return NextResponse.json(
        { success: false, error: 'המייל כבר מאומת' },
        { status: 400 }
      )
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // 24 hours

    // Update manager with new token
    const { error: updateError } = await supabase
      .from('city_managers')
      .update({
        verification_token: verificationToken,
        verification_token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', manager.id)

    if (updateError) {
      console.error('Error updating verification token:', updateError)
      return NextResponse.json(
        { success: false, error: 'שגיאה ביצירת קישור אימות' },
        { status: 500 }
      )
    }

    // Send verification email
    try {
      const { sendVerificationEmail } = await import('@/lib/email')
      await sendVerificationEmail(manager.email, verificationToken, manager.name)
    } catch (emailError) {
      console.error('Error sending verification email:', emailError)
      return NextResponse.json(
        { success: false, error: 'שגיאה בשליחת מייל אימות' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'קישור אימות נשלח למייל שלך'
    })

  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאה בשליחת קישור אימות' },
      { status: 500 }
    )
  }
}
