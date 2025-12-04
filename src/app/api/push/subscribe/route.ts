/**
 * API Route: Subscribe to Push Notifications
 * POST /api/push/subscribe
 *
 * Saves a push subscription to the database
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('sb-access-token')?.value

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'לא מורשה - נדרשת התחברות' },
        { status: 401 }
      )
    }

    const supabase = createServiceClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'לא מורשה - נדרשת התחברות' },
        { status: 401 }
      )
    }

    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const isSuperAdmin = userData?.role === 'super_admin'

    const body = await request.json()
    const { subscription, userAgent, cityId } = body

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { success: false, error: 'נתוני subscription חסרים' },
        { status: 400 }
      )
    }

    // cityId is required for city managers, optional for super admin
    if (!cityId && !isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: 'חסר cityId' },
        { status: 400 }
      )
    }

    // Check if subscription already exists
    const { data: existingSub } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', subscription.endpoint)
      .single()

    if (existingSub) {
      // Update existing subscription
      const { error: updateError } = await supabase
        .from('push_subscriptions')
        .update({
          city_id: cityId || null,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          user_agent: userAgent,
          is_active: true,
          is_super_admin: isSuperAdmin,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSub.id)

      if (updateError) {
        console.error('Error updating subscription:', updateError)
        return NextResponse.json(
          { success: false, error: 'שגיאה בעדכון subscription' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Subscription עודכן בהצלחה',
      })
    }

    // Insert new subscription
    const { error: insertError } = await supabase
      .from('push_subscriptions')
      .insert({
        user_id: user.id,
        city_id: cityId || null,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: userAgent,
        is_super_admin: isSuperAdmin,
      })

    if (insertError) {
      console.error('Error inserting subscription:', insertError)
      return NextResponse.json(
        { success: false, error: 'שגיאה בשמירת subscription' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription נשמר בהצלחה',
    })
  } catch (error) {
    console.error('Push subscribe error:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאת שרת פנימית' },
      { status: 500 }
    )
  }
}
