import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  // Require authentication
  const { user, error } = await requireAuth(request)

  if (error) {
    return error
  }

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'לא מורשה - נדרשת התחברות' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { full_name, phone, email, current_password, new_password } = body

    // Validate required fields
    if (!full_name || !phone || !email) {
      return NextResponse.json(
        { success: false, error: 'שם, טלפון ואימייל הם שדות חובה' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // If password change requested, verify current password first
    if (new_password) {
      if (!current_password) {
        return NextResponse.json(
          { success: false, error: 'יש להזין את הסיסמה הנוכחית' },
          { status: 400 }
        )
      }

      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: current_password
      })

      if (signInError) {
        return NextResponse.json(
          { success: false, error: 'הסיסמה הנוכחית שגויה' },
          { status: 400 }
        )
      }

      // Update password in Supabase Auth
      const { error: passwordError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: new_password }
      )

      if (passwordError) {
        console.error('Error updating password:', passwordError)
        return NextResponse.json(
          { success: false, error: 'שגיאה בעדכון הסיסמה' },
          { status: 500 }
        )
      }
    }

    // Update email in Supabase Auth if changed
    if (email !== user.email) {
      // Update email with email confirmation required
      // This will send a confirmation email to the new address
      const { error: emailError } = await supabase.auth.admin.updateUserById(
        user.id,
        {
          email,
          email_confirm: false  // Require email confirmation
        }
      )

      if (emailError) {
        console.error('Error updating email:', emailError)
        return NextResponse.json(
          { success: false, error: 'שגיאה בעדכון האימייל' },
          { status: 500 }
        )
      }

      console.log('📧 Email update requested - confirmation email sent to:', email)
    }

    // Update user data in public.users table
    console.log('📝 Updating user in database:', {
      user_id: user.id,
      full_name,
      phone,
      email
    })

    const { error: updateError } = await supabase
      .from('users')
      .update({
        full_name,
        phone,
        email,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('❌ Error updating user:', updateError)
      return NextResponse.json(
        { success: false, error: 'שגיאה בעדכון הפרטים' },
        { status: 500 }
      )
    }

    console.log('✅ User updated successfully in database')

    // If this is a city manager, update their name/phone in all managed cities
    if (user.role === 'city_manager') {
      const { data: cities, error: citiesError } = await supabase
        .from('cities')
        .select('id, manager1_user_id, manager2_user_id')
        .or(`manager1_user_id.eq.${user.id},manager2_user_id.eq.${user.id}`)

      if (!citiesError && cities && cities.length > 0) {
        for (const city of cities) {
          const cityUpdateData: any = {}

          if (city.manager1_user_id === user.id) {
            cityUpdateData.manager1_name = full_name
            cityUpdateData.manager1_phone = phone || null
          }
          if (city.manager2_user_id === user.id) {
            cityUpdateData.manager2_name = full_name
            cityUpdateData.manager2_phone = phone || null
          }

          if (Object.keys(cityUpdateData).length > 0) {
            await supabase
              .from('cities')
              .update(cityUpdateData)
              .eq('id', city.id)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'הפרטים עודכנו בהצלחה'
    })

  } catch (error) {
    console.error('Error in update-account:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאה בעדכון הפרטים' },
      { status: 500 }
    )
  }
}
