/**
 * Combined Daily Cron Job
 * GET /api/cron/daily
 *
 * Runs daily and handles:
 * 1. Recalculate equipment priorities
 * 2. Send daily alerts (low stock, faulty equipment)
 * 3. Send monthly report (on 1st of month)
 *
 * Schedule: Run daily at 6:00 AM UTC (9:00 AM Israel time)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  sendStockRefillReminder,
  sendFaultyEquipmentReminder,
  sendMonthlyReportEmail,
  MonthlyReportData,
  logEmail
} from '@/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Configuration
const LOW_STOCK_THRESHOLD = 2
const FAULTY_DAYS_THRESHOLD = 21
const FOLLOW_UP_DAYS = 7

interface TaskResult {
  task: string
  status: 'success' | 'error' | 'skipped'
  details?: any
  error?: string
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

    const results: TaskResult[] = []
    const now = new Date()

    // === TASK 1: Recalculate Equipment Priorities ===
    try {
      const { error } = await supabase.rpc('recalculate_equipment_priority')
      if (error) {
        results.push({
          task: 'recalculate_priority',
          status: 'error',
          error: error.message
        })
      } else {
        results.push({
          task: 'recalculate_priority',
          status: 'success'
        })
      }
    } catch (error) {
      results.push({
        task: 'recalculate_priority',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // === TASK 2: Daily Alerts ===
    const alertResults = await processDailyAlerts(now)
    results.push({
      task: 'daily_alerts',
      status: alertResults.errors > 0 ? 'error' : 'success',
      details: alertResults
    })

    // === TASK 3: Monthly Report (only on 1st of month) ===
    if (now.getDate() === 1) {
      const reportResults = await processMonthlyReports(now)
      results.push({
        task: 'monthly_reports',
        status: reportResults.errors > 0 ? 'error' : 'success',
        details: reportResults
      })
    } else {
      results.push({
        task: 'monthly_reports',
        status: 'skipped',
        details: { reason: 'Not 1st of month' }
      })
    }

    console.log('Daily cron completed:', results)

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results
    })

  } catch (error) {
    console.error('Daily cron error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ==================== DAILY ALERTS ====================

interface AlertSummary {
  total: number
  sent: number
  skipped: number
  errors: number
  details: any[]
}

async function processDailyAlerts(now: Date): Promise<AlertSummary> {
  const alertDetails: any[] = []

  // Get all active cities with their managers (email via users join)
  const { data: cities, error: citiesError } = await supabase
    .from('cities')
    .select(`
      id,
      name,
      manager1_name,
      manager1_user_id,
      manager1_phone,
      manager:users!manager1_user_id(email)
    `)
    .eq('is_active', true)

  if (citiesError || !cities) {
    return {
      total: 0,
      sent: 0,
      skipped: 0,
      errors: 1,
      details: [{ error: citiesError?.message || 'Failed to fetch cities' }]
    }
  }

  for (const city of cities) {
    const managerEmail = (city.manager as any)?.email
    if (!managerEmail) {
      alertDetails.push({
        city: city.name,
        status: 'skipped',
        reason: 'No manager email'
      })
      continue
    }

    const cityWithEmail = { ...city, manager_email: managerEmail }

    // Process low stock alerts
    await processLowStockAlerts(cityWithEmail, alertDetails, now)

    // Process faulty equipment alerts
    await processFaultyEquipmentAlerts(cityWithEmail, alertDetails, now)
  }

  return {
    total: alertDetails.length,
    sent: alertDetails.filter(r => r.status === 'sent').length,
    skipped: alertDetails.filter(r => r.status === 'skipped').length,
    errors: alertDetails.filter(r => r.status === 'error').length,
    details: alertDetails
  }
}

async function processLowStockAlerts(city: any, results: any[], now: Date) {
  try {
    const { data: rawStockItems, error: stockError } = await supabase
      .from('city_equipment')
      .select(`
        id,
        quantity,
        global_equipment_id,
        global_equipment:global_equipment_pool(id, name, is_consumable)
      `)
      .eq('city_id', city.id)
      .lte('quantity', LOW_STOCK_THRESHOLD)

    // Only alert on consumable items
    const lowStockItems = rawStockItems?.filter(
      item => (item.global_equipment as any)?.is_consumable === true
    )

    if (stockError || !lowStockItems || lowStockItems.length === 0) {
      if (!stockError) {
        await supabase
          .from('alert_tracking')
          .update({ resolved_at: now.toISOString() })
          .eq('city_id', city.id)
          .eq('alert_type', 'low_stock')
          .is('resolved_at', null)
      }
      return
    }

    const { data: existingAlerts } = await supabase
      .from('alert_tracking')
      .select('*')
      .eq('city_id', city.id)
      .eq('alert_type', 'low_stock')
      .is('resolved_at', null)

    const alertMap = new Map(existingAlerts?.map(a => [a.reference_id, a]) || [])

    const newAlertItems: any[] = []
    const followUpItems: any[] = []

    for (const item of lowStockItems) {
      const equipmentId = item.global_equipment_id
      const existingAlert = alertMap.get(equipmentId)

      if (!existingAlert) {
        newAlertItems.push(item)
      } else {
        const lastAlertDate = new Date(existingAlert.last_alert_at)
        const daysSinceAlert = Math.floor((now.getTime() - lastAlertDate.getTime()) / (1000 * 60 * 60 * 24))

        if (daysSinceAlert >= FOLLOW_UP_DAYS) {
          followUpItems.push({ ...item, alertId: existingAlert.id })
        }
      }

      alertMap.delete(equipmentId)
    }

    for (const [, alert] of alertMap) {
      await supabase
        .from('alert_tracking')
        .update({ resolved_at: now.toISOString() })
        .eq('id', alert.id)
    }

    if (newAlertItems.length > 0) {
      const itemsForEmail = newAlertItems.map(item => ({
        name: (item.global_equipment as any)?.name || 'ציוד',
        quantity: item.quantity,
        minQuantity: LOW_STOCK_THRESHOLD
      }))

      const emailResult = await sendStockRefillReminder(
        city.manager_email,
        city.manager1_name || 'מנהל',
        city.name,
        itemsForEmail,
        false
      )

      if (emailResult.success) {
        for (const item of newAlertItems) {
          await supabase
            .from('alert_tracking')
            .insert({
              city_id: city.id,
              alert_type: 'low_stock',
              reference_id: item.global_equipment_id,
              reference_name: (item.global_equipment as any)?.name,
              last_alert_at: now.toISOString()
            })
        }

        await logEmail({
          recipientEmail: city.manager_email,
          recipientName: city.manager1_name,
          emailType: 'other',
          subject: `📦 תזכורת: מילוי מלאי נדרש - ${city.name}`,
          status: 'sent',
          metadata: {
            alert_type: 'low_stock',
            is_follow_up: false,
            items_count: newAlertItems.length
          }
        })
      }

      results.push({
        city: city.name,
        alertType: 'low_stock',
        status: emailResult.success ? 'sent' : 'error',
        isFollowUp: false,
        itemsCount: newAlertItems.length,
        error: emailResult.error
      })
    }

    if (followUpItems.length > 0) {
      const itemsForEmail = followUpItems.map(item => ({
        name: (item.global_equipment as any)?.name || 'ציוד',
        quantity: item.quantity,
        minQuantity: LOW_STOCK_THRESHOLD
      }))

      const emailResult = await sendStockRefillReminder(
        city.manager_email,
        city.manager1_name || 'מנהל',
        city.name,
        itemsForEmail,
        true
      )

      if (emailResult.success) {
        for (const item of followUpItems) {
          await supabase
            .from('alert_tracking')
            .update({ last_alert_at: now.toISOString() })
            .eq('id', item.alertId)
        }

        await logEmail({
          recipientEmail: city.manager_email,
          recipientName: city.manager1_name,
          emailType: 'other',
          subject: `⏰ תזכורת שנייה: מילוי מלאי נדרש - ${city.name}`,
          status: 'sent',
          metadata: {
            alert_type: 'low_stock',
            is_follow_up: true,
            items_count: followUpItems.length
          }
        })
      }

      results.push({
        city: city.name,
        alertType: 'low_stock_followup',
        status: emailResult.success ? 'sent' : 'error',
        isFollowUp: true,
        itemsCount: followUpItems.length,
        error: emailResult.error
      })
    }

  } catch (error) {
    console.error(`Error processing low stock alerts for ${city.name}:`, error)
    results.push({
      city: city.name,
      alertType: 'low_stock',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function processFaultyEquipmentAlerts(city: any, results: any[], now: Date) {
  try {
    // Get ALL currently faulty equipment (no updated_at filter — updated_at resets on any row update)
    const { data: faultyItems, error: faultyError } = await supabase
      .from('city_equipment')
      .select(`
        id,
        global_equipment_id,
        equipment_status,
        global_equipment:global_equipment_pool(id, name)
      `)
      .eq('city_id', city.id)
      .eq('equipment_status', 'faulty')

    if (faultyError || !faultyItems || faultyItems.length === 0) {
      if (!faultyError) {
        await supabase
          .from('alert_tracking')
          .update({ resolved_at: now.toISOString() })
          .eq('city_id', city.id)
          .eq('alert_type', 'faulty_equipment')
          .is('resolved_at', null)
      }
      return
    }

    const { data: existingAlerts } = await supabase
      .from('alert_tracking')
      .select('*')
      .eq('city_id', city.id)
      .eq('alert_type', 'faulty_equipment')
      .is('resolved_at', null)

    const alertMap = new Map(existingAlerts?.map(a => [a.reference_id, a]) || [])

    const newlyDetectedItems: any[] = []  // first time seen — just register, no email
    const initialAlertItems: any[] = []   // registered >= 21 days ago, no email sent yet
    const followUpItems: any[] = []

    for (const item of faultyItems) {
      const equipmentId = item.global_equipment_id
      const existingAlert = alertMap.get(equipmentId)

      if (!existingAlert) {
        // First time we see this as faulty — register it, don't email yet
        newlyDetectedItems.push(item)
      } else {
        const faultyDays = Math.floor(
          (now.getTime() - new Date(existingAlert.created_at).getTime()) / (1000 * 60 * 60 * 24)
        )

        if (!existingAlert.last_alert_at) {
          // Registered but no email sent yet — send initial alert if >= threshold days
          if (faultyDays >= FAULTY_DAYS_THRESHOLD) {
            initialAlertItems.push({ ...item, alertId: existingAlert.id, faultyDays })
          }
        } else {
          // Already alerted — check if follow-up is due
          const daysSinceLastAlert = Math.floor(
            (now.getTime() - new Date(existingAlert.last_alert_at).getTime()) / (1000 * 60 * 60 * 24)
          )
          if (daysSinceLastAlert >= FOLLOW_UP_DAYS) {
            followUpItems.push({ ...item, alertId: existingAlert.id, faultyDays })
          }
        }
      }

      alertMap.delete(equipmentId)
    }

    // Register newly detected faulty items (start the clock, no email)
    for (const item of newlyDetectedItems) {
      await supabase
        .from('alert_tracking')
        .insert({
          city_id: city.id,
          alert_type: 'faulty_equipment',
          reference_id: item.global_equipment_id,
          reference_name: (item.global_equipment as any)?.name
        })
    }

    const newAlertItems = initialAlertItems  // renamed for clarity below

    for (const [, alert] of alertMap) {
      await supabase
        .from('alert_tracking')
        .update({ resolved_at: now.toISOString() })
        .eq('id', alert.id)
    }

    if (newAlertItems.length > 0) {
      const itemsForEmail = newAlertItems.map(item => ({
        name: (item.global_equipment as any)?.name || 'ציוד',
        faultyDays: item.faultyDays,
        notes: undefined
      }))

      const emailResult = await sendFaultyEquipmentReminder(
        city.manager_email,
        city.manager1_name || 'מנהל',
        city.name,
        itemsForEmail,
        false
      )

      if (emailResult.success) {
        for (const item of newAlertItems) {
          // Update the existing alert_tracking record — set last_alert_at to mark email was sent
          await supabase
            .from('alert_tracking')
            .update({ last_alert_at: now.toISOString() })
            .eq('id', item.alertId)
        }

        await logEmail({
          recipientEmail: city.manager_email,
          recipientName: city.manager1_name,
          emailType: 'other',
          subject: `🔧 תזכורת: ציוד תקול דורש תיקון - ${city.name}`,
          status: 'sent',
          metadata: {
            alert_type: 'faulty_equipment',
            is_follow_up: false,
            items_count: newAlertItems.length
          }
        })
      }

      results.push({
        city: city.name,
        alertType: 'faulty_equipment',
        status: emailResult.success ? 'sent' : 'error',
        isFollowUp: false,
        itemsCount: newAlertItems.length,
        error: emailResult.error
      })
    }

    if (followUpItems.length > 0) {
      const itemsForEmail = followUpItems.map(item => ({
        name: (item.global_equipment as any)?.name || 'ציוד',
        faultyDays: item.faultyDays,
        notes: undefined
      }))

      const emailResult = await sendFaultyEquipmentReminder(
        city.manager_email,
        city.manager1_name || 'מנהל',
        city.name,
        itemsForEmail,
        true
      )

      if (emailResult.success) {
        for (const item of followUpItems) {
          await supabase
            .from('alert_tracking')
            .update({ last_alert_at: now.toISOString() })
            .eq('id', item.alertId)
        }

        await logEmail({
          recipientEmail: city.manager_email,
          recipientName: city.manager1_name,
          emailType: 'other',
          subject: `⏰ תזכורת שנייה: ציוד תקול דורש תיקון - ${city.name}`,
          status: 'sent',
          metadata: {
            alert_type: 'faulty_equipment',
            is_follow_up: true,
            items_count: followUpItems.length
          }
        })
      }

      results.push({
        city: city.name,
        alertType: 'faulty_equipment_followup',
        status: emailResult.success ? 'sent' : 'error',
        isFollowUp: true,
        itemsCount: followUpItems.length,
        error: emailResult.error
      })
    }

  } catch (error) {
    console.error(`Error processing faulty equipment alerts for ${city.name}:`, error)
    results.push({
      city: city.name,
      alertType: 'faulty_equipment',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// ==================== MONTHLY REPORTS ====================

interface ReportSummary {
  total: number
  sent: number
  skipped: number
  errors: number
  details: any[]
}

async function processMonthlyReports(now: Date): Promise<ReportSummary> {
  const reportDetails: any[] = []

  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  const formatDate = (date: Date) => date.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  const { data: cities, error: citiesError } = await supabase
    .from('cities')
    .select(`
      id,
      name,
      manager1_name,
      manager1_user_id,
      manager:users!manager1_user_id(email)
    `)
    .eq('is_active', true)

  if (citiesError || !cities) {
    return {
      total: 0,
      sent: 0,
      skipped: 0,
      errors: 1,
      details: [{ error: citiesError?.message || 'Failed to fetch cities' }]
    }
  }

  for (const city of cities) {
    const managerEmail = (city.manager as any)?.email
    if (!managerEmail) {
      reportDetails.push({
        city: city.name,
        status: 'skipped',
        reason: 'No manager email'
      })
      continue
    }

    try {
      const reportData = await collectCityStats(city.id, city.name, lastMonth, lastMonthEnd, now)

      const emailResult = await sendMonthlyReportEmail(
        managerEmail,
        city.manager1_name || 'מנהל',
        {
          ...reportData,
          periodStart: formatDate(lastMonth),
          periodEnd: formatDate(lastMonthEnd)
        }
      )

      if (emailResult.success) {
        await logEmail({
          recipientEmail: managerEmail,
          recipientName: city.manager1_name,
          emailType: 'other',
          subject: `📊 דוח חודשי - ${city.name}`,
          status: 'sent',
          metadata: {
            report_type: 'monthly',
            period_start: lastMonth.toISOString(),
            period_end: lastMonthEnd.toISOString(),
            total_borrows: reportData.totalBorrows
          }
        })

        reportDetails.push({
          city: city.name,
          status: 'sent'
        })
      } else {
        reportDetails.push({
          city: city.name,
          status: 'error',
          error: emailResult.error
        })
      }

    } catch (error) {
      console.error(`Error sending report to ${city.name}:`, error)
      reportDetails.push({
        city: city.name,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return {
    total: reportDetails.length,
    sent: reportDetails.filter(r => r.status === 'sent').length,
    skipped: reportDetails.filter(r => r.status === 'skipped').length,
    errors: reportDetails.filter(r => r.status === 'error').length,
    details: reportDetails
  }
}

async function collectCityStats(
  cityId: string,
  cityName: string,
  periodStart: Date,
  periodEnd: Date,
  now: Date
): Promise<MonthlyReportData> {
  const { data: borrowsData } = await supabase
    .from('borrow_history')
    .select('id, equipment_name, global_equipment_id, status')
    .eq('city_id', cityId)
    .gte('borrow_date', periodStart.toISOString())
    .lte('borrow_date', periodEnd.toISOString())

  const totalBorrows = borrowsData?.length || 0
  const totalReturns = borrowsData?.filter(b => b.status === 'returned').length || 0
  const pendingReturns = borrowsData?.filter(b => b.status === 'borrowed').length || 0

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

  const { data: requestsData } = await supabase
    .from('equipment_requests')
    .select('id, status')
    .eq('city_id', cityId)
    .gte('created_at', periodStart.toISOString())
    .lte('created_at', periodEnd.toISOString())

  const approvedRequests = requestsData?.filter(r => r.status === 'approved' || r.status === 'picked_up').length || 0
  const rejectedRequests = requestsData?.filter(r => r.status === 'rejected').length || 0
  const activeRequests = requestsData?.filter(r => r.status === 'pending').length || 0

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
    periodStart: '',
    periodEnd: '',
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
