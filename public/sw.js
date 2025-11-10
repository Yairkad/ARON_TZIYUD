// Service Worker for Web Push Notifications
// This file handles push notifications and displays them to the user

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated')
  event.waitUntil(self.clients.claim())
})

// Listen for push events
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push event received')

  if (!event.data) {
    console.log('Push event but no data')
    return
  }

  let data
  try {
    data = event.data.json()
  } catch (e) {
    data = {
      title: 'בקשה חדשה',
      body: event.data.text(),
      icon: '/icon-192.png',
      badge: '/badge-72.png'
    }
  }

  const options = {
    body: data.body || 'יש בקשות חדשות ממתינות לאישור',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/badge-72.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'equipment-request',
    requireInteraction: true,
    data: {
      url: data.url || '/',
      cityId: data.cityId
    },
    actions: [
      {
        action: 'open',
        title: 'פתח בקשות'
      },
      {
        action: 'close',
        title: 'סגור'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'בקשה חדשה', options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.action)

  event.notification.close()

  if (event.action === 'close') {
    return
  }

  // Open the app when notification is clicked
  const urlToOpen = event.notification.data.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (let client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus()
          }
        }
        // If not, open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen)
        }
      })
  )
})

// Handle push subscription changes
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Push subscription changed')

  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then((subscription) => {
        // Send new subscription to server
        return fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: subscription.toJSON()
          })
        })
      })
  )
})
