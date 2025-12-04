// Service Worker - Caching + Push Notifications

const CACHE_NAME = 'pwa-cache'
const HOSTNAME_WHITELIST = [
  self.location.hostname,
  'fonts.gstatic.com',
  'fonts.googleapis.com',
  'cdn.jsdelivr.net'
]

// Install
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Fetch - caching strategy (stale-while-revalidate)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Only handle GET requests from whitelisted hosts
  if (event.request.method !== 'GET') return
  if (HOSTNAME_WHITELIST.indexOf(url.hostname) === -1) return
  if (url.pathname.startsWith('/api/')) return // Skip API calls

  const cached = caches.match(event.request)
  const fetched = fetch(event.request).then(resp => resp.clone())

  event.respondWith(
    Promise.race([fetched.catch(() => cached), cached])
      .then(resp => resp || fetched)
      .catch(() => {})
  )

  event.waitUntil(
    Promise.all([fetched, caches.open(CACHE_NAME)])
      .then(([response, cache]) => response.ok && cache.put(event.request, response))
      .catch(() => {})
  )
})

// Push Notifications
self.addEventListener('push', (event) => {
  if (!event.data) return

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
      { action: 'open', title: 'פתח בקשות' },
      { action: 'close', title: 'סגור' }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'בקשה חדשה', options)
  )
})

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'close') return

  const urlToOpen = event.notification.data.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (let client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus()
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen)
        }
      })
  )
})

// Push subscription change
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then((subscription) => {
        return fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: subscription.toJSON() })
        })
      })
  )
})
