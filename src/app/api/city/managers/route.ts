/**
 * GET  /api/city/managers?city_id=xxx
 *   Returns all manager assignments for a city with visibility settings.
 *   Accessible by the city's own managers and super_admins.
 *
 * PATCH /api/city/managers
 *   Updates is_contact_visible / override_name / override_phone for one assignment.
 *   Body: { city_id, user_id, is_contact_visible?, override_name?, override_phone? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

async function getAuthUser(request: NextRequest) {
  const supabase = createServiceClient()
  const token = request.cookies.get('sb-access-token')?.value
  if (!token) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  const { data: profile } = await supabase.from('users').select('role, is_active').eq('id', user.id).single()
  if (!profile?.is_active) return null
  return { ...user, role: profile.role }
}

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ success: false, error: 'לא מורשה' }, { status: 401 })
  }

  const cityId = request.nextUrl.searchParams.get('city_id')
  if (!cityId) {
    return NextResponse.json({ success: false, error: 'חסר city_id' }, { status: 400 })
  }

  // City managers can only view their own city's assignments
  if (authUser.role === 'city_manager') {
    const { data: own } = await supabase
      .from('city_manager_assignments')
      .select('id')
      .eq('city_id', cityId)
      .eq('user_id', authUser.id)
      .maybeSingle()

    if (!own) {
      return NextResponse.json({ success: false, error: 'אין הרשאה לעיר זו' }, { status: 403 })
    }
  } else if (authUser.role !== 'super_admin') {
    return NextResponse.json({ success: false, error: 'אין הרשאה' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('city_manager_assignments')
    .select('id, user_id, display_role, is_contact_visible, override_name, override_phone, users(id, full_name, email, phone, is_active)')
    .eq('city_id', cityId)
    .order('created_at')

  if (error) {
    return NextResponse.json({ success: false, error: 'שגיאה בטעינת מנהלים' }, { status: 500 })
  }

  const managers = (data || []).map((a: any) => ({
    assignment_id: a.id,
    user_id: a.user_id,
    full_name: a.users?.full_name || '',
    email: a.users?.email || '',
    phone: a.users?.phone || '',
    is_active: a.users?.is_active ?? true,
    display_role: a.display_role || 'manager1',
    is_contact_visible: a.is_contact_visible,
    override_name: a.override_name,
    override_phone: a.override_phone,
  }))

  return NextResponse.json({ success: true, managers })
}

export async function PATCH(request: NextRequest) {
  const supabase = createServiceClient()
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ success: false, error: 'לא מורשה' }, { status: 401 })
  }

  const body = await request.json()
  const { city_id, user_id, is_contact_visible, override_name, override_phone } = body

  if (!city_id || !user_id) {
    return NextResponse.json({ success: false, error: 'חסרים city_id / user_id' }, { status: 400 })
  }

  // City managers can only update their own city
  if (authUser.role === 'city_manager') {
    const { data: own } = await supabase
      .from('city_manager_assignments')
      .select('id')
      .eq('city_id', city_id)
      .eq('user_id', authUser.id)
      .maybeSingle()

    if (!own) {
      return NextResponse.json({ success: false, error: 'אין הרשאה לעיר זו' }, { status: 403 })
    }
  } else if (authUser.role !== 'super_admin') {
    return NextResponse.json({ success: false, error: 'אין הרשאה' }, { status: 403 })
  }

  const updateData: any = {}
  if (is_contact_visible !== undefined) updateData.is_contact_visible = is_contact_visible
  if (override_name !== undefined) updateData.override_name = override_name || null
  if (override_phone !== undefined) updateData.override_phone = override_phone || null

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ success: false, error: 'אין שדות לעדכון' }, { status: 400 })
  }

  const { error } = await supabase
    .from('city_manager_assignments')
    .update(updateData)
    .eq('city_id', city_id)
    .eq('user_id', user_id)

  if (error) {
    return NextResponse.json({ success: false, error: 'שגיאה בעדכון' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'הגדרות תצוגה עודכנו בהצלחה' })
}
