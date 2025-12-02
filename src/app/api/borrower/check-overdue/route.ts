/**
 * API Route: Check if borrower has overdue equipment
 * GET /api/borrower/check-overdue?phone={phone}&city_id={city_id}
 *
 * Returns whether a borrower has any overdue equipment (borrowed > 24 hours ago)
 * Used to block new borrows until they return all equipment
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Overdue threshold in hours
const OVERDUE_HOURS = 24

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')
    const cityId = searchParams.get('city_id')

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Normalize phone number (remove non-digits)
    const normalizedPhone = phone.replace(/\D/g, '')

    // Calculate the threshold date (24 hours ago)
    const thresholdDate = new Date()
    thresholdDate.setHours(thresholdDate.getHours() - OVERDUE_HOURS)

    // Query for borrowed (not returned) items older than threshold
    let query = supabase
      .from('borrow_history')
      .select(`
        id,
        name,
        phone,
        equipment_name,
        borrow_date,
        status,
        city_id
      `)
      .or(`phone.eq.${normalizedPhone},phone.eq.0${normalizedPhone},phone.eq.${normalizedPhone.replace(/^972/, '0')}`)
      .eq('status', 'borrowed')
      .lt('borrow_date', thresholdDate.toISOString())

    // Optionally filter by city
    if (cityId) {
      query = query.eq('city_id', cityId)
    }

    const { data: overdueItems, error } = await query

    if (error) {
      console.error('Error checking overdue items:', error)
      return NextResponse.json(
        { error: 'Failed to check overdue items' },
        { status: 500 }
      )
    }

    const hasOverdue = overdueItems && overdueItems.length > 0

    return NextResponse.json({
      hasOverdue,
      overdueCount: overdueItems?.length || 0,
      overdueItems: overdueItems?.map(item => ({
        id: item.id,
        equipmentName: item.equipment_name,
        borrowDate: item.borrow_date,
        hoursOverdue: Math.floor((Date.now() - new Date(item.borrow_date).getTime()) / (1000 * 60 * 60))
      })) || [],
      message: hasOverdue
        ? `יש לך ${overdueItems.length} פריט/ים שטרם הוחזרו. יש להחזיר את הציוד לפני השאלה חדשה.`
        : null
    })

  } catch (error) {
    console.error('Check overdue error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
