import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * API endpoint להעלאת תמונת החזרת ציוד
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const historyId = formData.get('historyId') as string

    if (!file) {
      return NextResponse.json(
        { error: 'לא נשלח קובץ' },
        { status: 400 }
      )
    }

    if (!historyId) {
      return NextResponse.json(
        { error: 'חסר מזהה רשומה' },
        { status: 400 }
      )
    }

    // בדיקת סוג קובץ
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'יש להעלות תמונה בפורמט JPG, PNG או WEBP' },
        { status: 400 }
      )
    }

    // בדיקת גודל קובץ (מקסימום 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'גודל התמונה לא יכול לעלות על 5MB' },
        { status: 400 }
      )
    }

    // יצירת שם קובץ ייחודי
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(7)
    const extension = file.name.split('.').pop()
    const fileName = `return_${historyId}_${timestamp}_${randomStr}.${extension}`

    // המרת File ל-ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // העלאה ל-Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('return-images')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading to storage:', uploadError)
      return NextResponse.json(
        { error: 'שגיאה בהעלאת התמונה' },
        { status: 500 }
      )
    }

    // קבלת URL ציבורי של התמונה
    const { data: { publicUrl } } = supabase.storage
      .from('return-images')
      .getPublicUrl(fileName)

    // עדכון רשומת borrow_history עם ה-URL של התמונה
    const { error: updateError } = await supabase
      .from('borrow_history')
      .update({
        return_image_url: publicUrl,
        return_image_uploaded_at: new Date().toISOString()
      })
      .eq('id', historyId)

    if (updateError) {
      console.error('Error updating borrow_history:', updateError)

      // נסה למחוק את התמונה שהועלתה
      await supabase.storage
        .from('return-images')
        .remove([fileName])

      return NextResponse.json(
        { error: 'שגיאה בעדכון רשומת ההחזרה' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
      message: 'התמונה הועלתה בהצלחה'
    })

  } catch (error) {
    console.error('Upload return image error:', error)
    return NextResponse.json(
      { error: 'שגיאת שרת' },
      { status: 500 }
    )
  }
}
