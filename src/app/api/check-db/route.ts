import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// Endpoint לבדיקת מצב הטבלה settings
export async function GET() {
  try {
    console.log('[DB CHECK] Starting database diagnostics...')

    // 1. נסה לקרוא את כל השורות מטבלת settings
    const { data: allSettings, error: allError } = await supabaseServer
      .from('settings')
      .select('*')

    console.log('[DB CHECK] All settings query result:', { allSettings, allError })

    // 2. נסה לקרוא ספציפית את super_admin_password
    const { data: superAdminSetting, error: superAdminError } = await supabaseServer
      .from('settings')
      .select('*')
      .eq('key', 'super_admin_password')
      .maybeSingle() // maybeSingle במקום single כדי לא לזרוק שגיאה אם אין שורה

    console.log('[DB CHECK] Super admin password query result:', { superAdminSetting, superAdminError })

    // 3. ספירת שורות
    const { count, error: countError } = await supabaseServer
      .from('settings')
      .select('*', { count: 'exact', head: true })

    console.log('[DB CHECK] Count query result:', { count, countError })

    return NextResponse.json({
      success: true,
      diagnostics: {
        allSettings: {
          data: allSettings,
          error: allError,
          rowCount: allSettings?.length || 0
        },
        superAdminSetting: {
          data: superAdminSetting,
          error: superAdminError,
          exists: !!superAdminSetting
        },
        totalCount: {
          count,
          error: countError
        }
      },
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[DB CHECK] Exception:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
