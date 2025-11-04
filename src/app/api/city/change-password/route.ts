import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { cityId, currentPassword, newPassword } = await request.json()

    if (!cityId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'נדרשים כל השדות' },
        { status: 400 }
      )
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: 'הסיסמה החדשה חייבת להכיל לפחות 4 תווים' },
        { status: 400 }
      )
    }

    // שליפת נתוני העיר
    const { data: city, error } = await supabaseServer
      .from('cities')
      .select('id, password')
      .eq('id', cityId)
      .single()

    if (error || !city) {
      console.error('Error fetching city:', error)
      return NextResponse.json(
        { error: 'עיר לא נמצאה' },
        { status: 404 }
      )
    }

    // בדיקת הסיסמה הנוכחית
    let isPasswordValid = false

    if (city.password.startsWith('$2a$') || city.password.startsWith('$2b$')) {
      // סיסמה מוצפנת
      isPasswordValid = await bcrypt.compare(currentPassword, city.password)
    } else {
      // סיסמה ישנה בטקסט גלוי
      isPasswordValid = currentPassword === city.password
    }

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'הסיסמה הנוכחית שגויה' },
        { status: 401 }
      )
    }

    // הצפנת הסיסמה החדשה
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // עדכון הסיסמה
    const { error: updateError } = await supabaseServer
      .from('cities')
      .update({ password: hashedPassword })
      .eq('id', cityId)

    if (updateError) {
      console.error('Error updating password:', updateError)
      return NextResponse.json(
        { error: 'שגיאה בעדכון הסיסמה' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'הסיסמה שונתה בהצלחה'
    })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { error: 'שגיאה בתהליך שינוי הסיסמה' },
      { status: 500 }
    )
  }
}
