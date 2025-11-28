/**
 * City Statistics API
 * GET /api/city/[cityId]/statistics
 *
 * Returns comprehensive statistics for a city
 * Used for reports dashboard and monthly email reports
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface StatisticsParams {
  params: Promise<{ cityId: string }>
}

export async function GET(request: NextRequest, { params }: StatisticsParams) {
  try {
    const { cityId } = await params

    // Get query parameters for date range
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    // Default to current month if no dates provided
    const now = new Date()
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const periodStart = startDate ? new Date(startDate) : defaultStart
    const periodEnd = endDate ? new Date(endDate) : defaultEnd

    // Verify city exists
    const { data: city, error: cityError } = await supabase
      .from('cities')
      .select('id, name, manager1_name, manager_email')
      .eq('id', cityId)
      .single()

    if (cityError || !city) {
      return NextResponse.json(
        { error: 'City not found' },
        { status: 404 }
      )
    }

    // === BORROW STATISTICS ===
    // Total borrows in period
    const { data: borrowsData, error: borrowsError } = await supabase
      .from('borrow_history')
      .select('id, equipment_name, global_equipment_id, status, borrow_date, return_date')
      .eq('city_id', cityId)
      .gte('borrow_date', periodStart.toISOString())
      .lte('borrow_date', periodEnd.toISOString())

    const totalBorrows = borrowsData?.length || 0
    const totalReturns = borrowsData?.filter(b => b.status === 'returned').length || 0
    const pendingReturns = borrowsData?.filter(b => b.status === 'borrowed').length || 0

    // Top borrowed items
    const borrowCounts: { [key: string]: { name: string; count: number } } = {}
    borrowsData?.forEach(borrow => {
      const key = borrow.global_equipment_id || borrow.equipment_name
      if (!borrowCounts[key]) {
        borrowCounts[key] = { name: borrow.equipment_name, count: 0 }
      }
      borrowCounts[key].count++
    })

    const topBorrowedItems = Object.values(borrowCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // === REQUEST STATISTICS ===
    const { data: requestsData } = await supabase
      .from('equipment_requests')
      .select('id, status, created_at')
      .eq('city_id', cityId)
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString())

    const totalRequests = requestsData?.length || 0
    const approvedRequests = requestsData?.filter(r => r.status === 'approved' || r.status === 'picked_up').length || 0
    const rejectedRequests = requestsData?.filter(r => r.status === 'rejected').length || 0
    const activeRequests = requestsData?.filter(r => r.status === 'pending').length || 0

    // === EQUIPMENT STATUS ===
    // Low stock items
    const { data: lowStockItems } = await supabase
      .from('city_equipment')
      .select(`
        id,
        quantity,
        global_equipment:global_equipment_pool(name)
      `)
      .eq('city_id', cityId)
      .lte('quantity', 2)

    const lowStock = (lowStockItems || []).map(item => ({
      name: (item.global_equipment as any)?.name || 'ציוד',
      quantity: item.quantity
    }))

    // Faulty items
    const { data: faultyData } = await supabase
      .from('city_equipment')
      .select(`
        id,
        equipment_status,
        updated_at,
        global_equipment:global_equipment_pool(name)
      `)
      .eq('city_id', cityId)
      .eq('equipment_status', 'faulty')

    const faultyItems = (faultyData || []).map(item => {
      const faultyDate = new Date(item.updated_at)
      const days = Math.floor((now.getTime() - faultyDate.getTime()) / (1000 * 60 * 60 * 24))
      return {
        name: (item.global_equipment as any)?.name || 'ציוד',
        days
      }
    })

    // === TREND DATA (last 6 months) ===
    const trendData: { month: string; borrows: number; returns: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)

      const { data: monthBorrows } = await supabase
        .from('borrow_history')
        .select('id, status')
        .eq('city_id', cityId)
        .gte('borrow_date', monthStart.toISOString())
        .lte('borrow_date', monthEnd.toISOString())

      const monthName = monthStart.toLocaleDateString('he-IL', { month: 'short' })
      trendData.push({
        month: monthName,
        borrows: monthBorrows?.length || 0,
        returns: monthBorrows?.filter(b => b.status === 'returned').length || 0
      })
    }

    // === EQUIPMENT INVENTORY SUMMARY ===
    const { data: inventoryData } = await supabase
      .from('city_equipment')
      .select(`
        id,
        quantity,
        equipment_status,
        is_consumable,
        global_equipment:global_equipment_pool(name, category_id)
      `)
      .eq('city_id', cityId)

    const totalItems = inventoryData?.length || 0
    const totalQuantity = inventoryData?.reduce((sum, item) => sum + item.quantity, 0) || 0
    const workingItems = inventoryData?.filter(i => i.equipment_status === 'working').length || 0
    const consumableItems = inventoryData?.filter(i => i.is_consumable).length || 0

    // === ACTIVITY LOG (recent) ===
    const { data: activityData } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('city_id', cityId)
      .gte('created_at', periodStart.toISOString())
      .order('created_at', { ascending: false })
      .limit(20)

    // Format period dates
    const formatDate = (date: Date) => date.toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    return NextResponse.json({
      success: true,
      city: {
        id: city.id,
        name: city.name
      },
      period: {
        start: formatDate(periodStart),
        end: formatDate(periodEnd),
        startDate: periodStart.toISOString(),
        endDate: periodEnd.toISOString()
      },
      borrows: {
        total: totalBorrows,
        returned: totalReturns,
        pending: pendingReturns,
        returnRate: totalBorrows > 0 ? Math.round((totalReturns / totalBorrows) * 100) : 0
      },
      requests: {
        total: totalRequests,
        approved: approvedRequests,
        rejected: rejectedRequests,
        active: activeRequests,
        approvalRate: totalRequests > 0 ? Math.round((approvedRequests / totalRequests) * 100) : 0
      },
      topBorrowedItems,
      equipment: {
        lowStock,
        faulty: faultyItems
      },
      inventory: {
        totalItems,
        totalQuantity,
        workingItems,
        faultyItems: totalItems - workingItems,
        consumableItems
      },
      trends: trendData,
      recentActivity: activityData || []
    })

  } catch (error) {
    console.error('Statistics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
