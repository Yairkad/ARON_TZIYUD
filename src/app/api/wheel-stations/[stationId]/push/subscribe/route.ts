/**
 * API Route: Subscribe to Push Notifications for Wheel Station
 * POST /api/wheel-stations/[stationId]/push/subscribe
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
) {
  try {
    const { stationId } = await params
    const body = await request.json()
    const { subscription, manager_phone, manager_password } = body

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'נתוני subscription חסרים' },
        { status: 400 }
      )
    }

    if (!manager_phone || !manager_password) {
      return NextResponse.json(
        { error: 'נדרש טלפון וסיסמה' },
        { status: 400 }
      )
    }

    // Verify manager credentials
    const { data: station, error: stationError } = await supabase
      .from('wheel_stations')
      .select('id, manager_password')
      .eq('id', stationId)
      .single()

    if (stationError || !station) {
      return NextResponse.json({ error: 'תחנה לא נמצאה' }, { status: 404 })
    }

    if (station.manager_password !== manager_password) {
      return NextResponse.json({ error: 'סיסמה שגויה' }, { status: 401 })
    }

    // Verify manager exists in this station
    const { data: manager } = await supabase
      .from('wheel_station_managers')
      .select('id')
      .eq('station_id', stationId)
      .eq('phone', manager_phone)
      .single()

    if (!manager) {
      return NextResponse.json({ error: 'מנהל לא נמצא' }, { status: 404 })
    }

    // Check if subscription already exists
    const { data: existingSub } = await supabase
      .from('wheel_station_push_subscriptions')
      .select('id')
      .eq('endpoint', subscription.endpoint)
      .single()

    if (existingSub) {
      // Update existing subscription
      const { error: updateError } = await supabase
        .from('wheel_station_push_subscriptions')
        .update({
          station_id: stationId,
          manager_phone,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          user_agent: body.userAgent,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSub.id)

      if (updateError) {
        console.error('Error updating subscription:', updateError)
        return NextResponse.json(
          { error: 'שגיאה בעדכון subscription' },
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
      .from('wheel_station_push_subscriptions')
      .insert({
        station_id: stationId,
        manager_phone,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: body.userAgent,
      })

    if (insertError) {
      console.error('Error inserting subscription:', insertError)
      return NextResponse.json(
        { error: 'שגיאה בשמירת subscription' },
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
      { error: 'שגיאת שרת פנימית' },
      { status: 500 }
    )
  }
}

// DELETE - Unsubscribe
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
) {
  try {
    const { stationId } = await params
    const body = await request.json()
    const { endpoint, manager_phone, manager_password } = body

    if (!endpoint) {
      return NextResponse.json({ error: 'חסר endpoint' }, { status: 400 })
    }

    // Verify manager credentials
    const { data: station } = await supabase
      .from('wheel_stations')
      .select('manager_password')
      .eq('id', stationId)
      .single()

    if (!station || station.manager_password !== manager_password) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    // Remove subscription
    const { error } = await supabase
      .from('wheel_station_push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('manager_phone', manager_phone)

    if (error) {
      console.error('Error deleting subscription:', error)
      return NextResponse.json(
        { error: 'שגיאה במחיקת subscription' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'בוטל בהצלחה',
    })
  } catch (error) {
    console.error('Push unsubscribe error:', error)
    return NextResponse.json(
      { error: 'שגיאת שרת פנימית' },
      { status: 500 }
    )
  }
}

// GET - Check if subscribed
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
) {
  try {
    const { stationId } = await params
    const { searchParams } = new URL(request.url)
    const manager_phone = searchParams.get('manager_phone')

    if (!manager_phone) {
      return NextResponse.json({ error: 'חסר טלפון' }, { status: 400 })
    }

    const { data: subs } = await supabase
      .from('wheel_station_push_subscriptions')
      .select('id, is_active')
      .eq('station_id', stationId)
      .eq('manager_phone', manager_phone)
      .eq('is_active', true)

    return NextResponse.json({
      subscribed: subs && subs.length > 0,
      count: subs?.length || 0,
    })
  } catch (error) {
    console.error('Check subscription error:', error)
    return NextResponse.json(
      { error: 'שגיאת שרת' },
      { status: 500 }
    )
  }
}
