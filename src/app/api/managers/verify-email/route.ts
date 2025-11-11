import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import crypto from 'crypto'

/**
 * POST /api/managers/verify-email
 * Verify city manager email with token
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'נדרש טוקן אימות' },
        { status: 400 }
      )
    }

    // Find manager with this verification token
    const { data: manager, error: fetchError } = await supabase
      .from('city_managers')
      .select('*')
      .eq('verification_token', token)
      .single()

    if (fetchError || !manager) {
      return NextResponse.json(
        { success: false, error: 'טוקן אימות לא תקין' },
        { status: 400 }
      )
    }

    // Check if token expired
    if (manager.verification_token_expires_at) {
      const expiresAt = new Date(manager.verification_token_expires_at)
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { success: false, error: 'טוקן האימות פג תוקף. אנא בקש טוקן חדש.' },
          { status: 400 }
        )
      }
    }

    // Mark email as verified and clear verification token
    const { error: updateError } = await supabase
      .from('city_managers')
      .update({
        email_verified: true,
        verification_token: null,
        verification_token_expires_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', manager.id)

    if (updateError) {
      console.error('Error verifying email:', updateError)
      return NextResponse.json(
        { success: false, error: 'שגיאה באימות המייל' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'המייל אומת בהצלחה! כעת תוכל להתחבר למערכת.',
      manager: {
        id: manager.id,
        email: manager.email,
        name: manager.name
      }
    })

  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאה באימות המייל' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/managers/verify-email?email=xxx
 * Resend verification email
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'נדרשת כתובת מייל' },
        { status: 400 }
      )
    }

    // Find manager by email
    const { data: manager, error: fetchError } = await supabase
      .from('city_managers')
      .select('*')
      .eq('email', email)
      .single()

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
        { success: false, error: 'שגיאה בשליחת מייל אימות' },
        { status: 500 }
      )
    }

    // Send verification email
    const { sendVerificationEmail } = await import('@/lib/email')
    await sendVerificationEmail(manager.email, verificationToken, manager.name)

    return NextResponse.json({
      success: true,
      message: 'מייל אימות נשלח בהצלחה'
    })

  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאה בשליחת מייל אימות' },
      { status: 500 }
    )
  }
}
