'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isPushSubscribed,
  registerServiceWorker,
} from '@/lib/push-notifications'

export default function NotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    // Check if notifications are supported
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSupported(false)
      return
    }

    // Get current permission
    setPermission(Notification.permission)

    // Check subscription status
    isPushSubscribed().then(setIsSubscribed)
  }, [])

  const handleEnableNotifications = async () => {
    setLoading(true)
    try {
      // Request permission
      const perm = await requestNotificationPermission()
      setPermission(perm)

      if (perm === 'granted') {
        // Register service worker
        const registration = await registerServiceWorker()
        
        if (registration) {
          // Subscribe to push
          const subscription = await subscribeToPushNotifications(registration)
          
          if (subscription) {
            setIsSubscribed(true)
            alert('התראות הופעלו בהצלחה! \nתקבל התראות על בקשות חדשות גם כשהאתר סגור.')
          } else {
            alert('שגיאה ברישום להתראות')
          }
        }
      } else {
        alert('יש לתת הרשאה להתראות כדי להפעיל את התכונה')
      }
    } catch (error) {
      console.error('Error enabling notifications:', error)
      alert('שגיאה בהפעלת התראות')
    } finally {
      setLoading(false)
    }
  }

  const handleDisableNotifications = async () => {
    setLoading(true)
    try {
      const success = await unsubscribeFromPushNotifications()
      if (success) {
        setIsSubscribed(false)
        alert('התראות הוסרו בהצלחה')
      } else {
        alert('שגיאה בהסרת התראות')
      }
    } catch (error) {
      console.error('Error disabling notifications:', error)
      alert('שגיאה בהסרת התראות')
    } finally {
      setLoading(false)
    }
  }

  if (!supported) {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-semibold text-yellow-900 mb-1">התראות לא נתמכות</p>
            <p className="text-sm text-yellow-800">
              הדפדפן שלך לא תומך בהתראות Push. נסה להשתמש בדפדפן מודרני יותר.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <span className="text-4xl">🔔</span>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              התראות Push
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              קבל התראות על בקשות חדשות גם כשהאתר סגור. ההתראות מגיעות ישירות למכשיר שלך.
            </p>

            {isSubscribed ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                  <span className="text-lg">✅</span>
                  <span className="text-sm font-medium">התראות מופעלות</span>
                </div>
                <Button
                  onClick={handleDisableNotifications}
                  disabled={loading}
                  variant="outline"
                  className="w-full border-2 border-red-200 hover:bg-red-50 text-red-700"
                >
                  {loading ? '⏳ מסיר התראות...' : '🔕 כבה התראות'}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {permission === 'denied' && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">
                      <strong>הרשאות נחסמו.</strong> יש לאפשר התראות בהגדרות הדפדפן.
                    </p>
                  </div>
                )}
                <Button
                  onClick={handleEnableNotifications}
                  disabled={loading || permission === 'denied'}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {loading ? '⏳ מפעיל...' : '🔔 הפעל התראות'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-xs text-gray-600">
          <strong>💡 טיפ:</strong> התראות Push פועלות גם כשהאתר סגור, כל עוד הדפדפן פתוח ברקע.
          במכשירים ניידים, ההתראות יופיעו בשורת ההתראות של המכשיר.
        </p>
      </div>
    </div>
  )
}

