import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Configure web-push with VAPID keys
// Generate keys with: npx web-push generate-vapid-keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

// VAPID subject must be mailto: or https:// URL
const getVapidSubject = () => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl && appUrl.startsWith('https://')) {
    return appUrl
  }
  return 'mailto:support@aron-tziyud.com'
}

// Only configure VAPID if both keys are properly set
let vapidConfigured = false
if (vapidPublicKey && vapidPrivateKey && vapidPrivateKey.length > 10) {
  try {
    webpush.setVapidDetails(
      getVapidSubject(),
      vapidPublicKey,
      vapidPrivateKey
    )
    vapidConfigured = true
  } catch (error) {
    console.error('Failed to configure VAPID:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { cityId, title, body, url } = await request.json()

    if (!cityId) {
      return NextResponse.json(
        { error: 'חסר city_id' },
        { status: 400 }
      )
    }

    if (!vapidConfigured) {
      return NextResponse.json({
        success: false,
        message: 'Push notifications are not configured',
        sent: 0
      })
    }

    // Get all push subscriptions for this city
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('city_id', cityId)

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError)
      return NextResponse.json(
        { error: 'שגיאה בשליפת מנויים' },
        { status: 500 }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'אין מנויים להתראות עבור העיר הזו',
        sent: 0
      })
    }

    // Prepare notification payload
    const payload = JSON.stringify({
      title: title || 'בקשה חדשה!',
      body: body || 'יש בקשות חדשות ממתינות לאישור',
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      url: url || `/city/${cityId}/admin`,
      cityId,
      tag: 'equipment-request'
    })

    // Send push notification to all subscriptions
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
          console.error('Error sending push to', sub.endpoint, error)

          // If subscription is no longer valid, delete it
          if (error.statusCode === 410 || error.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id)
          }

          return { success: false, endpoint: sub.endpoint, error: error.message }
        }
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = results.length - successful

    return NextResponse.json({
      success: true,
      message: `נשלחו ${successful} התראות בהצלחה`,
      sent: successful,
      failed,
      total: results.length
    })

  } catch (error) {
    console.error('Push send error:', error)
    return NextResponse.json(
      { error: 'שגיאת שרת' },
      { status: 500 }
    )
  }
}
