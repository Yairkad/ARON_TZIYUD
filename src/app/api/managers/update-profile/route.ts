import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createServiceClient } from '@/lib/supabase-server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

/**
 * PATCH /api/managers/update-profile
 * Update manager profile (name, phone, email, password)
 * If email changes, requires re-verification
 */
export async function PATCH(request: NextRequest) {
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

    const body = await request.json()
    const { name, phone, email, currentPassword, newPassword } = body

    // Try to find manager by auth user ID first
    // Then fallback to finding by email
    let manager
    let fetchError

    // First try to get by Supabase auth ID
    const managerByAuth = await supabase
      .from('city_managers')
      .select('*')
      .eq('id', user.id)
      .single()

    if (managerByAuth.data) {
      manager = managerByAuth.data
    } else {
      // Fallback: try to find by email
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

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Update name if provided
    if (name && name.trim() !== manager.name) {
      updateData.name = name.trim()
    }

    // Update phone if provided
    if (phone && phone.trim() !== manager.phone) {
      // Validate phone format (10 digits starting with 05)
      if (!/^05\d{8}$/.test(phone.trim())) {
        return NextResponse.json(
          { success: false, error: 'מספר טלפון חייב להיות בן 10 ספרות ולהתחיל ב-05' },
          { status: 400 }
        )
      }
      updateData.phone = phone.trim()
    }

    // Update email if provided and different
    let emailChanged = false
    if (email && email.trim().toLowerCase() !== manager.email.toLowerCase()) {
      const newEmail = email.trim().toLowerCase()

      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        return NextResponse.json(
          { success: false, error: 'כתובת מייל לא תקינה' },
          { status: 400 }
        )
      }

      // Check if email already exists
      const { data: existing } = await supabase
        .from('city_managers')
        .select('id')
        .eq('email', newEmail)
        .single()

      if (existing && existing.id !== manager.id) {
        return NextResponse.json(
          { success: false, error: 'כתובת המייל כבר קיימת במערכת' },
          { status: 400 }
        )
      }

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24) // 24 hours

      updateData.email = newEmail
      updateData.email_verified = false  // Require re-verification
      updateData.verification_token = verificationToken
      updateData.verification_token_expires_at = expiresAt.toISOString()

      emailChanged = true
    }

    // Update password if provided
    if (currentPassword && newPassword) {
      // Verify current password
      const passwordMatch = await bcrypt.compare(currentPassword, manager.password_hash)
      if (!passwordMatch) {
        return NextResponse.json(
          { success: false, error: 'הסיסמה הנוכחית שגויה' },
          { status: 400 }
        )
      }

      // Validate new password
      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: 'הסיסמה החדשה חייבת להכיל לפחות 6 תווים' },
          { status: 400 }
        )
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 10)
      updateData.password_hash = passwordHash
    }

    // Update manager
    const { error: updateError } = await supabase
      .from('city_managers')
      .update(updateData)
      .eq('id', manager.id)

    if (updateError) {
      console.error('Error updating manager:', updateError)
      return NextResponse.json(
        { success: false, error: 'שגיאה בעדכון הפרופיל' },
        { status: 500 }
      )
    }

    // Send verification email if email changed
    if (emailChanged && updateData.verification_token) {
      try {
        const { sendVerificationEmail } = await import('@/lib/email')
        await sendVerificationEmail(
          updateData.email,
          updateData.verification_token,
          updateData.name || manager.name
        )
      } catch (emailError) {
        console.error('Error sending verification email:', emailError)
        // Don't fail the update if email sending fails
      }
    }

    return NextResponse.json({
      success: true,
      message: emailChanged
        ? 'הפרופיל עודכן בהצלחה. נשלח מייל אימות לכתובת החדשה.'
        : 'הפרופיל עודכן בהצלחה!',
      emailChanged,
      requiresVerification: emailChanged
    })

  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאה בעדכון הפרופיל' },
      { status: 500 }
    )
  }
}
