import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Configure VAPID
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

let vapidConfigured = false
if (vapidPublicKey && vapidPrivateKey && vapidPrivateKey.length > 10) {
  try {
    const subject = process.env.VAPID_MAILTO || process.env.NEXT_PUBLIC_APP_URL || 'mailto:aronyedidim@gmail.com'
    webpush.setVapidDetails(subject, vapidPublicKey, vapidPrivateKey)
    vapidConfigured = true
  } catch (error) {
    console.error('Failed to configure VAPID:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, body, url, type } = await request.json()

    if (!vapidConfigured) {
      return NextResponse.json({
        success: false,
        message: 'Push notifications are not configured',
        sent: 0
      })
    }

    // Get all super admin push subscriptions
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('is_super_admin', true)
      .eq('is_active', true)

    if (fetchError) {
      console.error('Error fetching super admin subscriptions:', fetchError)
      return NextResponse.json(
        { error: 'שגיאה בשליפת מנויים' },
        { status: 500 }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'אין סופר אדמינים רשומים להתראות',
        sent: 0
      })
    }

    // Prepare notification payload
    const payload = JSON.stringify({
      title: title || 'התראה למנהל ראשי',
      body: body || '',
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      url: url || '/super-admin',
      tag: type || 'super-admin-notification'
    })

    // Send push notification to all super admin subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          }

          await webpush.sendNotification(pushSubscription, payload)

          // Update last_used_at
          await supabase
            .from('push_subscriptions')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', sub.id)

          return { success: true, endpoint: sub.endpoint }
        } catch (error: any) {
          console.error('Error sending push to super admin:', sub.endpoint, error)

          // If subscription is no longer valid, mark as inactive
          if (error.statusCode === 410 || error.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .update({ is_active: false })
              .eq('id', sub.id)
          }

          return { success: false, endpoint: sub.endpoint, error: error.message }
        }
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length
    const failed = results.length - successful

    return NextResponse.json({
      success: true,
      message: `נשלחו ${successful} התראות לסופר אדמינים`,
      sent: successful,
      failed,
      total: results.length
    })

  } catch (error) {
    console.error('Push send to super admins error:', error)
    return NextResponse.json(
      { error: 'שגיאת שרת' },
      { status: 500 }
    )
  }
}
