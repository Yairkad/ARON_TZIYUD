/**
 * Single Wheel Station API
 * GET /api/wheel-stations/[stationId] - Get station details with all wheels
 * PUT /api/wheel-stations/[stationId] - Update station (super admin or station manager for address only)
 * DELETE /api/wheel-stations/[stationId] - Delete station (super admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RouteParams {
  params: Promise<{ stationId: string }>
}

// Helper to verify station manager (by phone and password)
async function verifyStationManager(stationId: string, phone: string, password: string): Promise<{ success: boolean; error?: string }> {
  // Get station with password and managers
  const { data: station, error } = await supabase
    .from('wheel_stations')
    .select(`
      manager_password,
      wheel_station_managers (phone)
    `)
    .eq('id', stationId)
    .single()

  if (error || !station) {
    return { success: false, error: 'Station not found' }
  }

  // Check password
  if (station.manager_password !== password) {
    return { success: false, error: 'סיסמא שגויה' }
  }

  // Check if phone is in managers list
  const cleanPhone = phone.replace(/\D/g, '')
  const isManager = station.wheel_station_managers.some((m: { phone: string }) =>
    m.phone.replace(/\D/g, '') === cleanPhone
  )

  if (!isManager) {
    return { success: false, error: 'מספר הטלפון לא נמצא ברשימת המנהלים' }
  }

  return { success: true }
}

// GET - Get station details with all wheels (public access)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { stationId } = await params

    const { data: station, error } = await supabase
      .from('wheel_stations')
      .select(`
        id,
        name,
        address,
        city_id,
        district,
        is_active,
        manager_password,
        deposit_amount,
        payment_methods,
        cities (name),
        wheel_station_managers (
          id,
          full_name,
          phone,
          role,
          is_primary
        )
      `)
      .eq('id', stationId)
      .single()

    if (error || !station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 })
    }

    // Get wheels separately with availability status
    const { data: wheels } = await supabase
      .from('wheels')
      .select('*')
      .eq('station_id', stationId)
      .order('wheel_number')

    // Get active borrows to show borrower info
    const { data: activeBorrows } = await supabase
      .from('wheel_borrows')
      .select('id, wheel_id, borrower_name, borrower_phone, borrower_id_number, borrower_address, vehicle_model, borrow_date, expected_return_date, deposit_type, deposit_details, signature_data, signed_at')
      .eq('station_id', stationId)
      .eq('status', 'borrowed')

    // Map borrows to wheels
    const borrowMap = new Map(
      activeBorrows?.map(b => [b.wheel_id, {
        id: b.id,
        borrower_name: b.borrower_name,
        borrower_phone: b.borrower_phone,
        borrower_id_number: b.borrower_id_number,
        borrower_address: b.borrower_address,
        vehicle_model: b.vehicle_model,
        borrow_date: b.borrow_date,
        expected_return_date: b.expected_return_date,
        deposit_type: b.deposit_type,
        deposit_details: b.deposit_details,
        is_signed: !!b.signature_data,
        signed_at: b.signed_at
      }]) || []
    )

    const wheelsWithBorrowInfo = wheels?.map(w => ({
      ...w,
      current_borrow: w.is_available ? undefined : borrowMap.get(w.id)
    })) || []

    return NextResponse.json({
      station: {
        ...station,
        wheels: wheelsWithBorrowInfo,
        totalWheels: wheels?.length || 0,
        availableWheels: wheels?.filter(w => w.is_available).length || 0
      }
    })
  } catch (error) {
    console.error('Error in GET /api/wheel-stations/[stationId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper to verify super admin
async function verifySuperAdmin(): Promise<{ success: boolean; error?: string }> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value

  if (!accessToken) {
    return { success: false, error: 'Unauthorized' }
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'super_admin') {
    return { success: false, error: 'Forbidden - Super admin only' }
  }

  return { success: true }
}

// PUT - Update station (super admin for all fields, station manager for address only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { stationId } = await params
    const body = await request.json()
    const { name, address, city_id, district, is_active, managers, manager_password, manager_phone, current_password, deposit_amount, payment_methods } = body

    // Check if this is a station manager update (has manager_phone and current_password)
    if (manager_phone && current_password) {
      const managerAuth = await verifyStationManager(stationId, manager_phone, current_password)
      if (!managerAuth.success) {
        return NextResponse.json({ error: managerAuth.error }, { status: 401 })
      }

      // Station managers can update address, deposit_amount, and payment_methods
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const managerUpdate: { address?: string; deposit_amount?: number; payment_methods?: any } = {}
      if (address !== undefined) managerUpdate.address = address
      if (deposit_amount !== undefined) managerUpdate.deposit_amount = deposit_amount
      if (payment_methods !== undefined) managerUpdate.payment_methods = payment_methods

      if (Object.keys(managerUpdate).length > 0) {
        const { error: updateError } = await supabase
          .from('wheel_stations')
          .update(managerUpdate)
          .eq('id', stationId)

        if (updateError) {
          console.error('Error updating station:', updateError)
          return NextResponse.json({ error: 'Failed to update station' }, { status: 500 })
        }
      }

      return NextResponse.json({ success: true, message: 'הפרטים עודכנו בהצלחה' })
    }

    // Super admin authentication
    const auth = await verifySuperAdmin()
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
    }

    // Build update object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: { name?: string; address?: string; city_id?: string; district?: string; is_active?: boolean; manager_password?: string; deposit_amount?: number; payment_methods?: any } = {}
    if (name !== undefined) updateData.name = name
    if (address !== undefined) updateData.address = address
    if (city_id !== undefined) updateData.city_id = city_id
    if (district !== undefined) updateData.district = district
    if (is_active !== undefined) updateData.is_active = is_active
    if (manager_password !== undefined) updateData.manager_password = manager_password
    if (deposit_amount !== undefined) updateData.deposit_amount = deposit_amount
    if (payment_methods !== undefined) updateData.payment_methods = payment_methods

    // Update station
    const { error: updateError } = await supabase
      .from('wheel_stations')
      .update(updateData)
      .eq('id', stationId)

    if (updateError) {
      console.error('Error updating station:', updateError)
      return NextResponse.json({ error: 'Failed to update station' }, { status: 500 })
    }

    // Update managers if provided
    if (managers !== undefined) {
      // Delete existing managers
      await supabase
        .from('wheel_station_managers')
        .delete()
        .eq('station_id', stationId)

      // Add new managers
      if (managers.length > 0) {
        const managersWithStation = managers.map((m: { full_name: string; phone: string; role?: string; is_primary?: boolean }) => ({
          ...m,
          station_id: stationId
        }))

        const { error: managersError } = await supabase
          .from('wheel_station_managers')
          .insert(managersWithStation)

        if (managersError) {
          console.error('Error updating managers:', managersError)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PUT /api/wheel-stations/[stationId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete station
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await verifySuperAdmin()
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
    }

    const { stationId } = await params

    const { error } = await supabase
      .from('wheel_stations')
      .delete()
      .eq('id', stationId)

    if (error) {
      console.error('Error deleting station:', error)
      return NextResponse.json({ error: 'Failed to delete station' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/wheel-stations/[stationId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
