import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * API endpoint to recalculate equipment display_order based on borrow history
 * This should be called periodically (e.g., daily via cron job)
 *
 * Optional: Protect with API key for security
 */
export async function POST() {
  try {
    // Use service role for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Call the recalculate function
    const { error } = await supabase.rpc('recalculate_equipment_priority')

    if (error) {
      console.error('Error recalculating equipment priority:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log('✅ Equipment priorities recalculated successfully')
    return NextResponse.json({
      success: true,
      message: 'Equipment priorities recalculated based on usage history'
    })

  } catch (error) {
    console.error('Error in recalculate-priority API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Optional: Add GET endpoint to check when last recalculation happened
export async function GET() {
  return NextResponse.json({
    info: 'POST to this endpoint to recalculate equipment priorities based on borrow history',
    usage: 'Call this endpoint daily via cron job or webhook'
  })
}
