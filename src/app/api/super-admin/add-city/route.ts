import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const {
      name,
      manager1_name,
      manager1_phone,
      manager2_name,
      manager2_phone,
      location_url,
      password
    } = await request.json()

    if (!name || !manager1_name || !manager1_phone || !password) {
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

    // הצפנת הסיסמה
    const hashedPassword = await bcrypt.hash(password, 10)

    // הוספת העיר
    const { error } = await supabaseServer
      .from('cities')
      .insert([{
        name,
        manager1_name,
        manager1_phone,
        manager2_name: manager2_name || null,
        manager2_phone: manager2_phone || null,
        location_url: location_url || null,
        password: hashedPassword,
        is_active: true
      }])

    if (error) {
      console.error('Error adding city:', error)
      return NextResponse.json(
        { error: 'שגיאה בהוספת העיר' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'העיר נוספה בהצלחה'
    })
  } catch (error) {
    console.error('Add city error:', error)
    return NextResponse.json(
      { error: 'שגיאה בתהליך הוספת העיר' },
      { status: 500 }
    )
  }
}
