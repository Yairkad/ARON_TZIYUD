'use client'

import { useState, useRef } from 'react'
import { Camera, X, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { compressImage, addTimestampWatermark, isRecentPhoto } from '@/lib/image-utils'

interface CameraCaptureProps {
  onCapture: (file: File) => void
  onCancel: () => void
  maxSizeKB?: number
  requireRecent?: boolean
  maxAgeMinutes?: number
}

export default function CameraCapture({
  onCapture,
  onCancel,
  maxSizeKB = 500,
  requireRecent = true,
  maxAgeMinutes = 5
}: CameraCaptureProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [capturedFile, setCapturedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setIsProcessing(true)

    try {
      // בדיקה 1: האם זו תמונה?
      if (!file.type.startsWith('image/')) {
        throw new Error('יש לבחור קובץ תמונה')
      }

      // בדיקה 2: האם התמונה צולמה לאחרונה? (רק אם נדרש)
      if (requireRecent && !isRecentPhoto(file, maxAgeMinutes)) {
        throw new Error(`התמונה חייבת להיות צולמה ב-${maxAgeMinutes} הדקות האחרונות. אנא צלם תמונה חדשה.`)
      }

      // בדיקה 3: גודל קובץ מקסימלי (לפני דחיסה)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('גודל התמונה גדול מדי (מקסימום 10MB)')
      }

      // שלב 1: הוסף watermark עם תאריך ושעה
      const watermarkedBlob = await addTimestampWatermark(file)

      // שלב 2: דחוס את התמונה
      const compressedBlob = await compressImage(
        new File([watermarkedBlob], file.name, { type: 'image/jpeg' }),
        maxSizeKB
      )

      // יצירת File מהדחיסה
      const compressedFile = new File(
        [compressedBlob],
        `return_${Date.now()}.jpg`,
        { type: 'image/jpeg' }
      )

      // יצירת preview
      const previewUrl = URL.createObjectURL(compressedBlob)
      setPreview(previewUrl)
      setCapturedFile(compressedFile)

      setIsProcessing(false)
    } catch (err: any) {
      console.error('Error processing image:', err)
      setError(err.message || 'שגיאה בעיבוד התמונה')
      setIsProcessing(false)
      setPreview(null)
      setCapturedFile(null)
    }
  }

  const handleConfirm = () => {
    if (capturedFile) {
      onCapture(capturedFile)
    }
  }

  const handleRetake = () => {
    setPreview(null)
    setCapturedFile(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Camera className="h-6 w-6 text-blue-600" />
            צלם תמונת החזרה
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">שגיאה</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {!preview ? (
          <div>
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                📸 יש לצלם תמונה של הציוד בארון
              </p>
              <p className="text-xs text-blue-600 mt-2">
                • התמונה תידחס אוטומטית
                <br />
                • תתווסף חותמת זמן לתמונה
                <br />
                {requireRecent && `• יש לצלם תמונה חדשה (עד ${maxAgeMinutes} דקות)`}
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
              id="camera-input"
            />

            <label
              htmlFor="camera-input"
              className={`
                flex items-center justify-center gap-3 w-full py-4 px-6
                bg-gradient-to-r from-blue-600 to-indigo-600
                text-white font-semibold rounded-xl
                cursor-pointer hover:from-blue-700 hover:to-indigo-700
                transition-all duration-200 hover:scale-105
                ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <Camera className="h-6 w-6" />
              {isProcessing ? 'מעבד תמונה...' : 'פתח מצלמה'}
            </label>

            <Button
              onClick={onCancel}
              variant="outline"
              className="w-full mt-3"
              disabled={isProcessing}
            >
              ביטול
            </Button>
          </div>
        ) : (
          <div>
            <div className="mb-4 rounded-lg overflow-hidden border-2 border-gray-200">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-auto"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleConfirm}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Check className="h-5 w-5 ml-2" />
                אשר תמונה
              </Button>

              <Button
                onClick={handleRetake}
                variant="outline"
                className="flex-1"
              >
                <Camera className="h-5 w-5 ml-2" />
                צלם שוב
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
