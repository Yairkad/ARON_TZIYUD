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
    const { full_name, phone, current_password, new_password } = body

    // Validate required fields
    if (!full_name || !phone) {
      return NextResponse.json(
        { success: false, error: 'שם וטלפון הם שדות חובה' },
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

      // Sign in with new password to get new tokens
      const { data: newSession, error: reAuthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: new_password
      })

      if (reAuthError || !newSession.session) {
        console.error('Error re-authenticating after password change:', reAuthError)
        // Password was changed successfully, but re-auth failed
        // Client should handle re-login manually
        return NextResponse.json({
          success: true,
          requireReLogin: true,
          message: 'הסיסמה שונתה בהצלחה. יש להתחבר מחדש.'
        })
      }

      // Return new tokens for client to update cookies
      return NextResponse.json({
        success: true,
        passwordChanged: true,
        newAccessToken: newSession.session.access_token,
        newRefreshToken: newSession.session.refresh_token,
        message: 'הסיסמה שונתה בהצלחה'
      })
    }

    // Update user data in public.users table
    console.log('📝 Updating user in database:', {
      user_id: user.id,
      full_name,
      phone
    })

    const { error: updateError } = await supabase
      .from('users')
      .update({
        full_name,
        phone,
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
