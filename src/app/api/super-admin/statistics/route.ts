/**
 * Super Admin Global Statistics API
 * GET /api/super-admin/statistics
 *
 * Returns comprehensive statistics across all cities
 * Used for super admin reports dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get query parameters for date range
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    // Default to current month if no dates provided
    const now = new Date()
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    let periodStart: Date
    let periodEnd: Date

    if (startDate) {
      periodStart = new Date(startDate)
      periodStart.setHours(0, 0, 0, 0)
    } else {
      periodStart = defaultStart
    }

    if (endDate) {
      periodEnd = new Date(endDate)
      periodEnd.setHours(23, 59, 59, 999)
    } else {
      periodEnd = defaultEnd
      periodEnd.setHours(23, 59, 59, 999)
    }

    // === GET ALL CITIES ===
    const { data: cities, error: citiesError } = await supabase
      .from('cities')
      .select('id, name, is_blocked, created_at')
      .order('name')

    if (citiesError) {
      console.error('Error fetching cities:', citiesError)
      return NextResponse.json({ error: 'Failed to fetch cities' }, { status: 500 })
    }

    const activeCities = cities?.filter(c => !c.is_blocked).length || 0
    const blockedCities = cities?.filter(c => c.is_blocked).length || 0

    // === BORROW STATISTICS (ALL CITIES) ===
    const { data: allBorrows } = await supabase
      .from('borrow_history')
      .select('id, city_id, equipment_name, status, borrow_date, return_date')
      .gte('borrow_date', periodStart.toISOString())
      .lte('borrow_date', periodEnd.toISOString())

    const totalBorrows = allBorrows?.length || 0
    const totalReturns = allBorrows?.filter(b => b.status === 'returned').length || 0
    const pendingReturns = allBorrows?.filter(b => b.status === 'borrowed').length || 0
    const pendingApproval = allBorrows?.filter(b => b.status === 'pending_approval').length || 0

    // Group borrows by city
    const borrowsByCity: { [cityId: string]: number } = {}
    allBorrows?.forEach(borrow => {
      borrowsByCity[borrow.city_id] = (borrowsByCity[borrow.city_id] || 0) + 1
    })

    // === REQUEST STATISTICS (ALL CITIES) ===
    const { data: allRequests } = await supabase
      .from('equipment_requests')
      .select('id, city_id, status, created_at')
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString())

    const totalRequests = allRequests?.length || 0
    const approvedRequests = allRequests?.filter(r => r.status === 'approved' || r.status === 'picked_up').length || 0
    const rejectedRequests = allRequests?.filter(r => r.status === 'rejected').length || 0
    const pendingRequests = allRequests?.filter(r => r.status === 'pending').length || 0

    // === EQUIPMENT STATISTICS (ALL CITIES) ===
    const { data: allEquipment } = await supabase
      .from('city_equipment')
      .select('id, city_id, quantity, equipment_status')

    const totalEquipmentTypes = allEquipment?.length || 0
    const totalQuantity = allEquipment?.reduce((sum, eq) => sum + eq.quantity, 0) || 0
    const faultyEquipment = allEquipment?.filter(eq => eq.equipment_status === 'faulty').length || 0

    // === TOP BORROWED ITEMS (ALL CITIES) ===
    const borrowCounts: { [key: string]: { name: string; count: number } } = {}
    allBorrows?.forEach(borrow => {
      const name = borrow.equipment_name
      if (!borrowCounts[name]) {
        borrowCounts[name] = { name, count: 0 }
      }
      borrowCounts[name].count++
    })

    const topBorrowedItems = Object.values(borrowCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // === TREND DATA (last 6 months) ===
    const trendData: { month: string; borrows: number; returns: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      monthStart.setHours(0, 0, 0, 0)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      monthEnd.setHours(23, 59, 59, 999)

      const { data: monthBorrows } = await supabase
        .from('borrow_history')
        .select('id, status')
        .gte('borrow_date', monthStart.toISOString())
        .lte('borrow_date', monthEnd.toISOString())

      const monthName = monthStart.toLocaleDateString('he-IL', { month: 'short' })
      trendData.push({
        month: monthName,
        borrows: monthBorrows?.length || 0,
        returns: monthBorrows?.filter(b => b.status === 'returned').length || 0
      })
    }

    // === CITY STATISTICS TABLE ===
    const cityStats = await Promise.all(
      (cities || []).map(async (city) => {
        // Get borrows for this city in period
        const cityBorrows = allBorrows?.filter(b => b.city_id === city.id) || []

        // Get pending requests for this city
        const cityPendingRequests = allRequests?.filter(
          r => r.city_id === city.id && r.status === 'pending'
        ).length || 0

        // Get equipment count for this city
        const cityEquipment = allEquipment?.filter(eq => eq.city_id === city.id) || []
        const cityFaulty = cityEquipment.filter(eq => eq.equipment_status === 'faulty').length

        // Get currently borrowed items (not returned)
        const { data: currentlyBorrowed } = await supabase
          .from('borrow_history')
          .select('id')
          .eq('city_id', city.id)
          .eq('status', 'borrowed')

        return {
          id: city.id,
          name: city.name,
          isBlocked: city.is_blocked,
          borrowsThisMonth: cityBorrows.length,
          returnsThisMonth: cityBorrows.filter(b => b.status === 'returned').length,
          currentlyBorrowed: currentlyBorrowed?.length || 0,
          pendingRequests: cityPendingRequests,
          equipmentCount: cityEquipment.length,
          faultyCount: cityFaulty
        }
      })
    )

    // Sort by borrows this month (most active first)
    cityStats.sort((a, b) => b.borrowsThisMonth - a.borrowsThisMonth)

    // === ALERTS ===
    const alerts: { type: string; message: string; cityId?: string; cityName?: string }[] = []

    // Cities with faulty equipment
    cityStats.forEach(city => {
      if (city.faultyCount > 0) {
        alerts.push({
          type: 'faulty',
          message: `${city.faultyCount} פריטים תקולים`,
          cityId: city.id,
          cityName: city.name
        })
      }
    })

    // Cities with pending requests
    cityStats.forEach(city => {
      if (city.pendingRequests > 0) {
        alerts.push({
          type: 'pending',
          message: `${city.pendingRequests} בקשות ממתינות`,
          cityId: city.id,
          cityName: city.name
        })
      }
    })

    // Cities with no activity this month
    const inactiveCities = cityStats.filter(c => c.borrowsThisMonth === 0 && !c.isBlocked)
    if (inactiveCities.length > 0) {
      alerts.push({
        type: 'inactive',
        message: `${inactiveCities.length} ערים ללא פעילות החודש`
      })
    }

    return NextResponse.json({
      period: {
        start: periodStart.toLocaleDateString('he-IL'),
        end: periodEnd.toLocaleDateString('he-IL')
      },
      summary: {
        totalCities: cities?.length || 0,
        activeCities,
        blockedCities
      },
      borrows: {
        total: totalBorrows,
        returned: totalReturns,
        pending: pendingReturns,
        pendingApproval,
        returnRate: totalBorrows > 0 ? Math.round((totalReturns / totalBorrows) * 100) : 0
      },
      requests: {
        total: totalRequests,
        approved: approvedRequests,
        rejected: rejectedRequests,
        pending: pendingRequests,
        approvalRate: totalRequests > 0 ? Math.round((approvedRequests / totalRequests) * 100) : 0
      },
      equipment: {
        totalTypes: totalEquipmentTypes,
        totalQuantity,
        faulty: faultyEquipment
      },
      topBorrowedItems,
      trends: trendData,
      cityStats,
      alerts
    })

  } catch (error) {
    console.error('Super admin statistics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
