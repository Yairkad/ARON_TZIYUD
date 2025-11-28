/**
 * Daily Alerts Cron Job
 * GET /api/cron/daily-alerts
 *
 * Runs daily to check and send:
 * 1. Low stock alerts (first alert + follow-up after 1 week)
 * 2. Faulty equipment alerts (3+ weeks, follow-up after 1 week)
 *
 * Schedule: Run daily at 9:00 AM Israel time
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  sendStockRefillReminder,
  sendFaultyEquipmentReminder,
  logEmail
} from '@/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Configuration
const LOW_STOCK_THRESHOLD = 2 // Alert when quantity <= 2
const FAULTY_DAYS_THRESHOLD = 21 // Alert when faulty for 3+ weeks (21 days)
const FOLLOW_UP_DAYS = 7 // Send follow-up after 7 days

interface AlertResult {
  city: string
  alertType: string
  status: 'sent' | 'skipped' | 'error'
  isFollowUp?: boolean
  itemsCount?: number
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

    const results: AlertResult[] = []
    const now = new Date()

    // Get all active cities with their managers
    const { data: cities, error: citiesError } = await supabase
      .from('cities')
      .select(`
        id,
        name,
        manager1_name,
        manager_email,
        manager1_phone
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
          alertType: 'all',
          status: 'skipped',
          reason: 'No manager email'
        })
        continue
      }

      // === LOW STOCK ALERTS ===
      await processLowStockAlerts(city, results, now)

      // === FAULTY EQUIPMENT ALERTS ===
      await processFaultyEquipmentAlerts(city, results, now)
    }

    // Summary
    const summary = {
      total: results.length,
      sent: results.filter(r => r.status === 'sent').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length
    }

    console.log('Daily alerts completed:', summary)

    return NextResponse.json({
      success: true,
      summary,
      results
    })

  } catch (error) {
    console.error('Daily alerts error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function processLowStockAlerts(
  city: any,
  results: AlertResult[],
  now: Date
) {
  try {
    // Get low stock items for this city
    const { data: lowStockItems, error: stockError } = await supabase
      .from('city_equipment')
      .select(`
        id,
        quantity,
        global_equipment_id,
        global_equipment:global_equipment_pool(id, name)
      `)
      .eq('city_id', city.id)
      .lte('quantity', LOW_STOCK_THRESHOLD)

    if (stockError || !lowStockItems || lowStockItems.length === 0) {
      // No low stock items - mark any existing alerts as resolved
      await supabase
        .from('alert_tracking')
        .update({ resolved_at: now.toISOString() })
        .eq('city_id', city.id)
        .eq('alert_type', 'low_stock')
        .is('resolved_at', null)
      return
    }

    // Check existing alerts for these items
    const { data: existingAlerts } = await supabase
      .from('alert_tracking')
      .select('*')
      .eq('city_id', city.id)
      .eq('alert_type', 'low_stock')
      .is('resolved_at', null)

    const alertMap = new Map(existingAlerts?.map(a => [a.reference_id, a]) || [])

    // Items that need first alert (no existing alert)
    const newAlertItems: any[] = []
    // Items that need follow-up (7+ days since last alert)
    const followUpItems: any[] = []
    // Items with existing recent alert (skip)
    const recentAlertItems: any[] = []

    for (const item of lowStockItems) {
      const equipmentId = item.global_equipment_id
      const existingAlert = alertMap.get(equipmentId)

      if (!existingAlert) {
        // New alert needed
        newAlertItems.push(item)
      } else {
        const lastAlertDate = new Date(existingAlert.last_alert_at)
        const daysSinceAlert = Math.floor((now.getTime() - lastAlertDate.getTime()) / (1000 * 60 * 60 * 24))

        if (daysSinceAlert >= FOLLOW_UP_DAYS) {
          followUpItems.push({ ...item, alertId: existingAlert.id })
        } else {
          recentAlertItems.push(item)
        }
      }

      // Remove from map to track resolved items
      alertMap.delete(equipmentId)
    }

    // Mark items no longer in low stock as resolved
    for (const [equipmentId, alert] of alertMap) {
      await supabase
        .from('alert_tracking')
        .update({ resolved_at: now.toISOString() })
        .eq('id', alert.id)
    }

    // Send first alert email if there are new items
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
        false // First alert
      )

      if (emailResult.success) {
        // Create alert tracking records
        for (const item of newAlertItems) {
          await supabase
            .from('alert_tracking')
            .insert({
              city_id: city.id,
              alert_type: 'low_stock',
              reference_id: item.global_equipment_id,
              reference_name: (item.global_equipment as any)?.name
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
        reason: emailResult.error
      })
    }

    // Send follow-up email if there are items needing follow-up
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
        true // Follow-up
      )

      if (emailResult.success) {
        // Update alert tracking records
        for (const item of followUpItems) {
          await supabase
            .from('alert_tracking')
            .update({
              last_alert_at: now.toISOString(),
              alert_count: supabase.rpc('increment_alert_count', { row_id: item.alertId })
            })
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
        reason: emailResult.error
      })
    }

  } catch (error) {
    console.error(`Error processing low stock alerts for ${city.name}:`, error)
    results.push({
      city: city.name,
      alertType: 'low_stock',
      status: 'error',
      reason: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function processFaultyEquipmentAlerts(
  city: any,
  results: AlertResult[],
  now: Date
) {
  try {
    // Get faulty equipment for this city that has been faulty for 3+ weeks
    const threeWeeksAgo = new Date(now)
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - FAULTY_DAYS_THRESHOLD)

    const { data: faultyItems, error: faultyError } = await supabase
      .from('city_equipment')
      .select(`
        id,
        global_equipment_id,
        equipment_status,
        updated_at,
        global_equipment:global_equipment_pool(id, name)
      `)
      .eq('city_id', city.id)
      .eq('equipment_status', 'faulty')
      .lte('updated_at', threeWeeksAgo.toISOString())

    if (faultyError || !faultyItems || faultyItems.length === 0) {
      // No faulty items - mark any existing alerts as resolved
      await supabase
        .from('alert_tracking')
        .update({ resolved_at: now.toISOString() })
        .eq('city_id', city.id)
        .eq('alert_type', 'faulty_equipment')
        .is('resolved_at', null)
      return
    }

    // Check existing alerts
    const { data: existingAlerts } = await supabase
      .from('alert_tracking')
      .select('*')
      .eq('city_id', city.id)
      .eq('alert_type', 'faulty_equipment')
      .is('resolved_at', null)

    const alertMap = new Map(existingAlerts?.map(a => [a.reference_id, a]) || [])

    const newAlertItems: any[] = []
    const followUpItems: any[] = []

    for (const item of faultyItems) {
      const equipmentId = item.global_equipment_id
      const existingAlert = alertMap.get(equipmentId)

      // Calculate days faulty
      const faultyDate = new Date(item.updated_at)
      const faultyDays = Math.floor((now.getTime() - faultyDate.getTime()) / (1000 * 60 * 60 * 24))

      if (!existingAlert) {
        newAlertItems.push({ ...item, faultyDays })
      } else {
        const lastAlertDate = new Date(existingAlert.last_alert_at)
        const daysSinceAlert = Math.floor((now.getTime() - lastAlertDate.getTime()) / (1000 * 60 * 60 * 24))

        if (daysSinceAlert >= FOLLOW_UP_DAYS) {
          followUpItems.push({ ...item, alertId: existingAlert.id, faultyDays })
        }
      }

      alertMap.delete(equipmentId)
    }

    // Mark resolved items
    for (const [equipmentId, alert] of alertMap) {
      await supabase
        .from('alert_tracking')
        .update({ resolved_at: now.toISOString() })
        .eq('id', alert.id)
    }

    // Send first alert for new faulty items
    if (newAlertItems.length > 0) {
      const itemsForEmail = newAlertItems.map(item => ({
        name: (item.global_equipment as any)?.name || 'ציוד',
        faultyDays: item.faultyDays,
        notes: undefined // Could add notes field to city_equipment in future
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
          await supabase
            .from('alert_tracking')
            .insert({
              city_id: city.id,
              alert_type: 'faulty_equipment',
              reference_id: item.global_equipment_id,
              reference_name: (item.global_equipment as any)?.name
            })
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
        reason: emailResult.error
      })
    }

    // Send follow-up for faulty items
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
            .update({
              last_alert_at: now.toISOString(),
              alert_count: supabase.rpc('increment_alert_count', { row_id: item.alertId })
            })
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
        reason: emailResult.error
      })
    }

  } catch (error) {
    console.error(`Error processing faulty equipment alerts for ${city.name}:`, error)
    results.push({
      city: city.name,
      alertType: 'faulty_equipment',
      status: 'error',
      reason: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
