import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// זהו endpoint זמני לבדיקה - למחוק אחרי שהבעיה תיפתר
export async function GET() {
  try {
    // נסה לקרוא מ-settings
    const { data: readData, error: readError } = await supabaseServer
      .from('settings')
      .select('*')
      .eq('key', 'super_admin_password')
      .single()

    if (readError) {
      return NextResponse.json({
        success: false,
        step: 'read',
        error: readError.message,
        details: readError
      })
    }

    // נסה לעדכן
    const { data: updateData, error: updateError } = await supabaseServer
      .from('settings')
      .update({ value: 'test_update_' + Date.now() })
      .eq('key', 'super_admin_password')
      .select()

    if (updateError) {
      return NextResponse.json({
        success: false,
        step: 'update',
        error: updateError.message,
        details: updateError,
        currentValue: readData?.value
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Update successful!',
      oldValue: readData?.value,
      newValue: updateData?.[0]?.value
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      step: 'exception',
      error: error.message,
      stack: error.stack
    })
  }
}
