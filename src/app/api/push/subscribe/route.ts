import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { cityId, subscription } = await request.json()

    if (!cityId || !subscription) {
      return NextResponse.json(
        { error: 'חסרים פרטים נדרשים' },
        { status: 400 }
      )
    }

    // Extract subscription details
    const { endpoint, keys } = subscription
    const { p256dh, auth } = keys

    // Get user agent for tracking
    const userAgent = request.headers.get('user-agent') || 'Unknown'

    // Upsert the subscription (update if exists, insert if not)
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        city_id: cityId,
        endpoint,
        p256dh,
        auth,
        user_agent: userAgent,
        last_used_at: new Date().toISOString()
      }, {
        onConflict: 'city_id,endpoint',
        ignoreDuplicates: false
      })

    if (error) {
      console.error('Error saving push subscription:', error)
      return NextResponse.json(
        { error: 'שגיאה בשמירת ההרשמה להתראות' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'ההרשמה להתראות נשמרה בהצלחה'
    })

  } catch (error) {
    console.error('Push subscribe error:', error)
    return NextResponse.json(
      { error: 'שגיאת שרת' },
      { status: 500 }
    )
  }
}

// Delete subscription
export async function DELETE(request: NextRequest) {
  try {
    const { endpoint } = await request.json()

    if (!endpoint) {
      return NextResponse.json(
        { error: 'חסר endpoint' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)

    if (error) {
      console.error('Error deleting push subscription:', error)
      return NextResponse.json(
        { error: 'שגיאה במחיקת ההרשמה' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'ההרשמה להתראות הוסרה'
    })

  } catch (error) {
    console.error('Push unsubscribe error:', error)
    return NextResponse.json(
      { error: 'שגיאת שרת' },
      { status: 500 }
    )
  }
}
