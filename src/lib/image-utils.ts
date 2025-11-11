/**
 * פונקציות עזר לטיפול בתמונות - דחיסה, שינוי גודל, ואופטימיזציה
 */

/**
 * דחיסת תמונה לפני העלאה
 * מצמצמת את גודל הקובץ משמעותית
 */
export async function compressImage(file: File, maxSizeKB: number = 500): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!

        // הגבל רזולוציה מקסימלית
        let width = img.width
        let height = img.height
        const MAX_WIDTH = 1200
        const MAX_HEIGHT = 1200

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height
            height = MAX_HEIGHT
          }
        }

        canvas.width = width
        canvas.height = height

        // צייר את התמונה בגודל החדש
        ctx.drawImage(img, 0, 0, width, height)

        // נסה איכויות שונות עד שמגיעים לגודל הרצוי
        let quality = 0.8
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'))
                return
              }

              const sizeKB = blob.size / 1024

              // אם הגודל מתאים או האיכות כבר נמוכה מדי - סיימנו
              if (sizeKB <= maxSizeKB || quality <= 0.3) {
                resolve(blob)
              } else {
                // נסה איכות נמוכה יותר
                quality -= 0.1
                tryCompress()
              }
            },
            'image/jpeg',
            quality
          )
        }

        tryCompress()
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * וידוא שהתמונה צולמה זה עתה (לא מהגלריה)
 * בודק את ה-metadata של התמונה
 */
export function isRecentPhoto(file: File, maxAgeMinutes: number = 5): boolean {
  // בדיקה 1: תאריך שינוי קובץ
  const now = Date.now()
  const fileAge = now - file.lastModified
  const maxAge = maxAgeMinutes * 60 * 1000 // המרה לאלפיות שניה

  return fileAge <= maxAge
}

/**
 * קבלת metadata של תמונה
 */
export async function getImageMetadata(file: File): Promise<{
  width: number
  height: number
  sizeKB: number
  lastModified: Date
  ageMinutes: number
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        const now = Date.now()
        const ageMs = now - file.lastModified

        resolve({
          width: img.width,
          height: img.height,
          sizeKB: Math.round(file.size / 1024),
          lastModified: new Date(file.lastModified),
          ageMinutes: Math.round(ageMs / 60000)
        })
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * בדיקה אם הדפדפן תומך ב-camera capture
 */
export function isCameraAvailable(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
}

/**
 * הוספת watermark לתמונה עם תאריך ושעה
 */
export async function addTimestampWatermark(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!

        canvas.width = img.width
        canvas.height = img.height

        // צייר את התמונה
        ctx.drawImage(img, 0, 0)

        // הוסף watermark עם תאריך ושעה
        const now = new Date()
        const dateStr = now.toLocaleDateString('he-IL', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })
        const timeStr = now.toLocaleTimeString('he-IL', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
        const watermark = `${dateStr} ${timeStr}`

        // עיצוב הטקסט
        const fontSize = Math.max(20, img.width / 40)
        ctx.font = `bold ${fontSize}px Arial`
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)'
        ctx.lineWidth = 3

        // מיקום הטקסט (פינה שמאלית תחתונה)
        const padding = 20
        const x = padding
        const y = img.height - padding

        // צייר רקע לטקסט
        const textMetrics = ctx.measureText(watermark)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
        ctx.fillRect(
          x - 10,
          y - fontSize - 5,
          textMetrics.width + 20,
          fontSize + 15
        )

        // צייר את הטקסט
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
        ctx.strokeText(watermark, x, y)
        ctx.fillText(watermark, x, y)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to create watermarked image'))
            }
          },
          'image/jpeg',
          0.9
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
