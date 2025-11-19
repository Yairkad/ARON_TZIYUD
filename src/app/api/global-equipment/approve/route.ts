import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// POST - Approve or reject pending equipment
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          }
        }
      }
    )
    const body = await request.json()
    const { equipmentId, action } = body // action: 'approve' | 'reject'

    if (!equipmentId || !action) {
      return NextResponse.json({ error: 'חסרים פרמטרים' }, { status: 400 })
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'פעולה לא חוקית' }, { status: 400 })
    }

    // Check authentication and role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'super_admin') {
      return NextResponse.json({ error: 'רק מנהל ראשי יכול לאשר/לדחות פריטים' }, { status: 403 })
    }

    // Get equipment details
    const { data: equipment } = await supabase
      .from('global_equipment_pool')
      .select('*')
      .eq('id', equipmentId)
      .single()

    if (!equipment) {
      return NextResponse.json({ error: 'פריט לא נמצא' }, { status: 404 })
    }

    if (equipment.status !== 'pending_approval') {
      return NextResponse.json({ error: 'פריט זה לא ממתין לאישור' }, { status: 400 })
    }

    if (action === 'approve') {
      // Approve - change status to active
      const { error } = await supabase
        .from('global_equipment_pool')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', equipmentId)

      if (error) {
        console.error('Error approving equipment:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ message: `הפריט "${equipment.name}" אושר והתווסף למאגר` })
    } else {
      // Reject - delete from pool
      const { error } = await supabase
        .from('global_equipment_pool')
        .delete()
        .eq('id', equipmentId)

      if (error) {
        console.error('Error rejecting equipment:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ message: `הבקשה להוספת "${equipment.name}" נדחתה` })
    }
  } catch (error) {
    console.error('Error in approve/reject:', error)
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
}
