// Utility functions for Web Push Notifications

// Convert VAPID public key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

// Check if push notifications are supported
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

// Check if user has granted notification permission
export function hasNotificationPermission(): boolean {
  return Notification.permission === 'granted'
}

// Request notification permission from user
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser')
  }

  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Workers are not supported')
  }

  const registration = await navigator.serviceWorker.register('/sw.js', {
    scope: '/'
  })

  // Wait for service worker to be ready
  await navigator.serviceWorker.ready

  return registration
}

// Subscribe to push notifications
export async function subscribeToPush(
  cityId: string,
  vapidPublicKey: string
): Promise<PushSubscription> {
  // Register service worker first
  const registration = await registerServiceWorker()

  // Check if already subscribed
  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    // Subscribe to push
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    })
  }

  // Save subscription to server
  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cityId,
      subscription: subscription.toJSON()
    })
  })

  if (!response.ok) {
    throw new Error('Failed to save push subscription')
  }

  return subscription
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()

  if (subscription) {
    // Unsubscribe from push manager
    await subscription.unsubscribe()

    // Remove from server
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: subscription.endpoint
      })
    })
  }
}

// Check if currently subscribed
export async function isSubscribed(): Promise<boolean> {
  if (!isPushSupported()) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration('/')
    if (!registration) {
      return false
    }

    const subscription = await registration.pushManager.getSubscription()
    return subscription !== null
  } catch (error) {
    console.error('Error checking subscription:', error)
    return false
  }
}
