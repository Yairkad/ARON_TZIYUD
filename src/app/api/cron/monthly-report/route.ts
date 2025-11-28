/**
 * Monthly Report Cron Job
 * GET /api/cron/monthly-report
 *
 * Sends monthly statistics report to city managers
 * Schedule: Run on 1st of each month at 8:00 AM Israel time
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  sendMonthlyReportEmail,
  MonthlyReportData,
  logEmail
} from '@/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ReportResult {
  city: string
  status: 'sent' | 'skipped' | 'error'
  reason?: string
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const results: ReportResult[] = []
    const now = new Date()

    // Get previous month's date range
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    const formatDate = (date: Date) => date.toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    // Get all active cities with managers
    const { data: cities, error: citiesError } = await supabase
      .from('cities')
      .select(`
        id,
        name,
        manager1_name,
        manager_email
      `)
      .eq('is_active', true)

    if (citiesError) {
      console.error('Error fetching cities:', citiesError)
      return NextResponse.json({ error: 'Failed to fetch cities' }, { status: 500 })
    }

    for (const city of cities || []) {
      // Skip if no manager email
      if (!city.manager_email) {
        results.push({
          city: city.name,
          status: 'skipped',
          reason: 'No manager email'
        })
        continue
      }

      try {
        // Collect statistics for the city
        const reportData = await collectCityStats(city.id, city.name, lastMonth, lastMonthEnd)

        // Send the report email
        const emailResult = await sendMonthlyReportEmail(
          city.manager_email,
          city.manager1_name || 'מנהל',
          {
            ...reportData,
            periodStart: formatDate(lastMonth),
            periodEnd: formatDate(lastMonthEnd)
          }
        )

        if (emailResult.success) {
          await logEmail({
            recipientEmail: city.manager_email,
            recipientName: city.manager1_name,
            emailType: 'other',
            subject: `📊 דוח חודשי - ${city.name}`,
            status: 'sent',
            metadata: {
              report_type: 'monthly',
              period_start: lastMonth.toISOString(),
              period_end: lastMonthEnd.toISOString(),
              total_borrows: reportData.totalBorrows,
              total_requests: reportData.activeRequestsCount + reportData.approvedRequestsCount + reportData.rejectedRequestsCount
            }
          })

          results.push({
            city: city.name,
            status: 'sent'
          })
        } else {
          results.push({
            city: city.name,
            status: 'error',
            reason: emailResult.error
          })
        }

      } catch (error) {
        console.error(`Error sending report to ${city.name}:`, error)
        results.push({
          city: city.name,
          status: 'error',
          reason: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Summary
    const summary = {
      total: results.length,
      sent: results.filter(r => r.status === 'sent').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length
    }

    console.log('Monthly reports completed:', summary)

    return NextResponse.json({
      success: true,
      summary,
      results
    })

  } catch (error) {
    console.error('Monthly report error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function collectCityStats(
  cityId: string,
  cityName: string,
  periodStart: Date,
  periodEnd: Date
): Promise<MonthlyReportData> {
  const now = new Date()

  // Borrow statistics
  const { data: borrowsData } = await supabase
    .from('borrow_history')
    .select('id, equipment_name, global_equipment_id, status')
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

  // Request statistics
  const { data: requestsData } = await supabase
    .from('equipment_requests')
    .select('id, status')
    .eq('city_id', cityId)
    .gte('created_at', periodStart.toISOString())
    .lte('created_at', periodEnd.toISOString())

  const approvedRequests = requestsData?.filter(r => r.status === 'approved' || r.status === 'picked_up').length || 0
  const rejectedRequests = requestsData?.filter(r => r.status === 'rejected').length || 0
  const activeRequests = requestsData?.filter(r => r.status === 'pending').length || 0

  // Low stock items
  const { data: lowStockData } = await supabase
    .from('city_equipment')
    .select(`
      quantity,
      global_equipment:global_equipment_pool(name)
    `)
    .eq('city_id', cityId)
    .lte('quantity', 2)

  const lowStockItems = (lowStockData || []).map(item => ({
    name: (item.global_equipment as any)?.name || 'ציוד',
    quantity: item.quantity
  }))

  // Faulty items
  const { data: faultyData } = await supabase
    .from('city_equipment')
    .select(`
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

  return {
    cityName,
    periodStart: '', // Will be set by caller
    periodEnd: '', // Will be set by caller
    totalBorrows,
    totalReturns,
    pendingReturns,
    topBorrowedItems,
    lowStockItems,
    faultyItems,
    activeRequestsCount: activeRequests,
    approvedRequestsCount: approvedRequests,
    rejectedRequestsCount: rejectedRequests
  }
}
