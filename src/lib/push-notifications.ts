/**
 * Service Worker Registration and Push Notifications Manager
 * This module handles:
 * - Registering the service worker
 * - Requesting notification permissions
 * - Subscribing to push notifications
 * - Managing push subscriptions
 */

// VAPID public key - this should be generated and stored in environment variables
// For now, we'll use a placeholder - you need to generate this using web-push library
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

/**
 * Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Register service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })
    
    console.log('✅ Service Worker registered successfully')
    
    // Wait for service worker to be ready
    await navigator.serviceWorker.ready
    
    return registration
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error)
    return null
  }
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported')
    return 'denied'
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  if (Notification.permission === 'denied') {
    return 'denied'
  }

  // Request permission
  const permission = await Notification.requestPermission()
  console.log('Notification permission:', permission)
  return permission
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  try {
    if (!VAPID_PUBLIC_KEY) {
      console.error('VAPID public key not configured')
      return null
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    console.log('✅ Push subscription created:', subscription)
    
    // Send subscription to server
    await savePushSubscription(subscription)
    
    return subscription
  } catch (error) {
    console.error('❌ Failed to subscribe to push notifications:', error)
    return null
  }
}

/**
 * Save push subscription to server
 */
async function savePushSubscription(subscription: PushSubscription): Promise<boolean> {
  try {
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to save subscription')
    }

    console.log('✅ Push subscription saved to server')
    return true
  } catch (error) {
    console.error('❌ Failed to save push subscription:', error)
    return false
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    
    if (!subscription) {
      console.log('No active subscription found')
      return true
    }

    // Unsubscribe from push manager
    await subscription.unsubscribe()
    
    // Remove from server
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        endpoint: subscription.endpoint,
      }),
    })

    console.log('✅ Unsubscribed from push notifications')
    return true
  } catch (error) {
    console.error('❌ Failed to unsubscribe:', error)
    return false
  }
}

/**
 * Check if user is subscribed to push notifications
 */
export async function isPushSubscribed(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return subscription !== null
  } catch (error) {
    console.error('Failed to check subscription status:', error)
    return false
  }
}

/**
 * Initialize push notifications (call this on app load for logged-in users)
 */
export async function initializePushNotifications(): Promise<void> {
  // Check if already subscribed
  const isSubscribed = await isPushSubscribed()
  if (isSubscribed) {
    console.log('Already subscribed to push notifications')
    return
  }

  // Register service worker
  const registration = await registerServiceWorker()
  if (!registration) {
    return
  }

  // Don't auto-request permission - let user decide via UI
  console.log('Service worker ready. User can enable notifications from settings.')
}

