import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { sendManagerAlertWhatsApp } from '@/lib/whatsapp'

// Default threshold for low stock warning
const LOW_STOCK_THRESHOLD = 5

/**
 * GET /api/cron/weekly-stock-alert
 * Sends weekly low stock alerts to manager1 of each city
 * Scheduled to run every Sunday at 8:00 AM Israel time
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (Vercel sends this header)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Allow in development or if no secret configured
      if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Get all active cities with their managers
    const { data: cities, error: citiesError } = await supabaseServer
      .from('cities')
      .select('id, name, manager1_name, manager1_phone')
      .eq('is_active', true)

    if (citiesError) {
      console.error('Error fetching cities:', citiesError)
      return NextResponse.json({ error: 'Failed to fetch cities' }, { status: 500 })
    }

    const results: any[] = []

    for (const city of cities || []) {
      // Skip if no manager1 phone
      if (!city.manager1_phone) {
        results.push({
          city: city.name,
          status: 'skipped',
          reason: 'No manager1 phone'
        })
        continue
      }

      // Get low stock consumable equipment for this city
      const { data: lowStockItems, error: stockError } = await supabaseServer
        .from('equipment')
        .select('name, quantity')
        .eq('city_id', city.id)
        .eq('is_consumable', true)
        .lt('quantity', LOW_STOCK_THRESHOLD)
        .order('quantity', { ascending: true })

      if (stockError) {
        console.error(`Error fetching stock for city ${city.name}:`, stockError)
        results.push({
          city: city.name,
          status: 'error',
          reason: stockError.message
        })
        continue
      }

      // Skip if no low stock items
      if (!lowStockItems || lowStockItems.length === 0) {
        results.push({
          city: city.name,
          status: 'skipped',
          reason: 'No low stock items'
        })
        continue
      }

      // Build alert message
      const itemsList = lowStockItems
        .map(item => `• ${item.name}: ${item.quantity} יחידות`)
        .join('\n')

      const details = `נמצאו ${lowStockItems.length} פריטים במלאי נמוך:\n\n${itemsList}\n\nמומלץ להשלים מלאי בהקדם.`

      // Send WhatsApp alert
      const whatsappResult = await sendManagerAlertWhatsApp(
        city.manager1_phone,
        city.manager1_name,
        'low_stock',
        details
      )

      results.push({
        city: city.name,
        status: whatsappResult.success ? 'sent' : 'failed',
        itemsCount: lowStockItems.length,
        messageId: whatsappResult.messageId,
        error: whatsappResult.error
      })
    }

    const sentCount = results.filter(r => r.status === 'sent').length
    const skippedCount = results.filter(r => r.status === 'skipped').length
    const failedCount = results.filter(r => r.status === 'failed' || r.status === 'error').length

    console.log('Weekly stock alert completed:', {
      sent: sentCount,
      skipped: skippedCount,
      failed: failedCount
    })

    return NextResponse.json({
      success: true,
      summary: {
        sent: sentCount,
        skipped: skippedCount,
        failed: failedCount
      },
      results
    })

  } catch (error) {
    console.error('Weekly stock alert error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
