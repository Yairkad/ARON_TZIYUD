import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'נדרשת סיסמה נוכחית וסיסמה חדשה' },
        { status: 400 }
      )
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: 'הסיסמה החדשה חייבת להכיל לפחות 4 תווים' },
        { status: 400 }
      )
    }

    // שליפת הסיסמה המוצפנת מהטבלה
    const { data, error } = await supabaseServer
      .from('settings')
      .select('value')
      .eq('key', 'super_admin_password')
      .single()

    if (error) {
      console.error('Error fetching password:', error)
      return NextResponse.json(
        { error: 'שגיאה בטעינת הגדרות' },
        { status: 500 }
      )
    }

    const storedPassword = data?.value || '1234'

    // בדיקת הסיסמה הנוכחית
    let isPasswordValid = false

    if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$')) {
      // סיסמה מוצפנת - השתמש ב-bcrypt
      isPasswordValid = await bcrypt.compare(currentPassword, storedPassword)
    } else {
      // סיסמה ישנה בטקסט גלוי
      isPasswordValid = currentPassword === storedPassword
    }

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'הסיסמה הנוכחית שגויה' },
        { status: 401 }
      )
    }

    // הצפנת הסיסמה החדשה
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // עדכון הסיסמה בטבלה
    const { error: updateError } = await supabaseServer
      .from('settings')
      .update({ value: hashedPassword })
      .eq('key', 'super_admin_password')

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
