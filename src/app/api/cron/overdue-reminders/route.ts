/**
 * Overdue Reminders Cron Job
 * GET /api/cron/overdue-reminders
 *
 * Runs periodically to check for overdue equipment and send reminders.
 * Sends WhatsApp message to borrowers who have equipment > 24 hours.
 *
 * Schedule: Run every 6 hours (or daily)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendOverdueReminderWhatsApp } from '@/lib/whatsapp'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Configuration
const OVERDUE_HOURS = 24 // Send reminder after 24 hours
const REMINDER_INTERVAL_HOURS = 24 // Don't send more than once per 24 hours

interface ReminderResult {
  borrowerId: string
  borrowerName: string
  phone: string
  equipmentName: string
  cityName: string
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

    const results: ReminderResult[] = []
    const now = new Date()

    // Calculate threshold (24 hours ago)
    const overdueThreshold = new Date(now)
    overdueThreshold.setHours(overdueThreshold.getHours() - OVERDUE_HOURS)

    // Get all borrowed items that are overdue
    const { data: overdueItems, error: overdueError } = await supabase
      .from('borrow_history')
      .select(`
        id,
        name,
        phone,
        equipment_name,
        borrow_date,
        city_id,
        last_reminder_sent_at
      `)
      .eq('status', 'borrowed')
      .lt('borrow_date', overdueThreshold.toISOString())

    if (overdueError) {
      console.error('Error fetching overdue items:', overdueError)
      return NextResponse.json(
        { error: 'Failed to fetch overdue items' },
        { status: 500 }
      )
    }

    if (!overdueItems || overdueItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No overdue items found',
        results: []
      })
    }

    console.log(`Found ${overdueItems.length} overdue items`)

    // Get city info for all unique cities
    const cityIds = [...new Set(overdueItems.map(item => item.city_id))]
    const { data: cities } = await supabase
      .from('cities')
      .select('id, name')
      .in('id', cityIds)

    const cityMap = new Map(cities?.map(c => [c.id, c.name]) || [])

    // Process each overdue item
    for (const item of overdueItems) {
      // Check if we already sent a reminder recently
      if (item.last_reminder_sent_at) {
        const lastReminder = new Date(item.last_reminder_sent_at)
        const hoursSinceReminder = (now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60)

        if (hoursSinceReminder < REMINDER_INTERVAL_HOURS) {
          results.push({
            borrowerId: item.id,
            borrowerName: item.name,
            phone: item.phone,
            equipmentName: item.equipment_name,
            cityName: cityMap.get(item.city_id) || 'Unknown',
            status: 'skipped',
            reason: `Reminder sent ${Math.floor(hoursSinceReminder)} hours ago`
          })
          continue
        }
      }

      // Calculate hours overdue
      const borrowDate = new Date(item.borrow_date)
      const hoursOverdue = Math.floor((now.getTime() - borrowDate.getTime()) / (1000 * 60 * 60))

      // Format borrow date for display
      const formattedBorrowDate = borrowDate.toLocaleDateString('he-IL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })

      const cityName = cityMap.get(item.city_id) || 'ארון ציוד'

      // Send WhatsApp reminder
      const whatsappResult = await sendOverdueReminderWhatsApp(
        item.phone,
        item.name,
        item.equipment_name,
        formattedBorrowDate,
        hoursOverdue,
        cityName
      )

      if (whatsappResult.success) {
        // Update last_reminder_sent_at
        await supabase
          .from('borrow_history')
          .update({ last_reminder_sent_at: now.toISOString() })
          .eq('id', item.id)

        results.push({
          borrowerId: item.id,
          borrowerName: item.name,
          phone: item.phone,
          equipmentName: item.equipment_name,
          cityName,
          status: 'sent'
        })
      } else {
        results.push({
          borrowerId: item.id,
          borrowerName: item.name,
          phone: item.phone,
          equipmentName: item.equipment_name,
          cityName,
          status: 'error',
          reason: whatsappResult.error
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

    console.log('Overdue reminders completed:', summary)

    return NextResponse.json({
      success: true,
      summary,
      results
    })

  } catch (error) {
    console.error('Overdue reminders error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
