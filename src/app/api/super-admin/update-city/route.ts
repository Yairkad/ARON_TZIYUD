import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const {
      cityId,
      name,
      manager1_name,
      manager1_phone,
      manager2_name,
      manager2_phone,
      location_url,
      password,
      is_active
    } = await request.json()

    if (!cityId || !name || !manager1_name || !manager1_phone || !password) {
      return NextResponse.json(
        { error: 'אנא מלא את כל השדות החובה (שם עיר, מנהל ראשון, טלפון, סיסמה)' },
        { status: 400 }
      )
    }

    if (manager1_phone.length !== 10) {
      return NextResponse.json(
        { error: 'טלפון מנהל ראשון חייב להיות בן 10 ספרות' },
        { status: 400 }
      )
    }

    if (manager2_phone && manager2_phone.length !== 10) {
      return NextResponse.json(
        { error: 'טלפון מנהל שני חייב להיות בן 10 ספרות (או השאר ריק)' },
        { status: 400 }
      )
    }

    // הצפנת הסיסמה אם היא לא מוצפנת
    let finalPassword = password
    if (!password.startsWith('$2a$') && !password.startsWith('$2b$')) {
      finalPassword = await bcrypt.hash(password, 10)
    }

    // עדכון העיר
    const { error: updateError } = await supabaseServer
      .from('cities')
      .update({
        name,
        manager1_name,
        manager1_phone,
        manager2_name: manager2_name || null,
        manager2_phone: manager2_phone || null,
        location_url: location_url || null,
        password: finalPassword,
        is_active: is_active !== undefined ? is_active : true
      })
      .eq('id', cityId)

    if (updateError) {
      console.error('Error updating city:', updateError)
      return NextResponse.json(
        { error: 'שגיאה בעדכון העיר' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'העיר עודכנה בהצלחה'
    })
  } catch (error) {
    console.error('Update city error:', error)
    return NextResponse.json(
      { error: 'שגיאה בתהליך עדכון העיר' },
      { status: 500 }
    )
  }
}
