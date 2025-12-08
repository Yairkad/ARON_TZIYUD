/**
 * Wheel Import API
 * POST /api/wheel-stations/[stationId]/import - Import wheels from Excel/JSON
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

interface WheelImportData {
  wheel_number: string | number  // Can be alphanumeric like "A23" or numeric like 15
  rim_size: string
  bolt_count: number
  bolt_spacing: number
  category?: string
  is_donut?: boolean | string  // Can be "כן"/"לא" or true/false
  notes?: string
}

// Map Hebrew column names to English
const hebrewToEnglishColumns: Record<string, string> = {
  'מספר_גלגל': 'wheel_number',
  'מספר גלגל': 'wheel_number',
  'גודל_ג\'אנט': 'rim_size',
  'גודל ג\'אנט': 'rim_size',
  'גודל_גאנט': 'rim_size',
  'גודל גאנט': 'rim_size',
  'כמות_ברגים': 'bolt_count',
  'כמות ברגים': 'bolt_count',
  'מרווח_ברגים': 'bolt_spacing',
  'מרווח ברגים': 'bolt_spacing',
  'קטגוריה': 'category',
  'דונאט': 'is_donut',
  'גלגל_דונאט': 'is_donut',
  'גלגל דונאט': 'is_donut',
  'הערות': 'notes',
}

// Convert Hebrew column names to English and normalize is_donut values
function normalizeWheelData(wheel: Record<string, unknown>): WheelImportData {
  const normalized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(wheel)) {
    const englishKey = hebrewToEnglishColumns[key] || key
    normalized[englishKey] = value
  }

  // Convert is_donut from Hebrew "כן"/"לא" to boolean
  if (normalized.is_donut !== undefined) {
    const val = String(normalized.is_donut).toLowerCase().trim()
    normalized.is_donut = val === 'כן' || val === 'true' || val === '1' || val === 'yes'
  }

  return normalized as WheelImportData
}

// Helper to verify station manager or super admin
async function verifyManager(stationId: string): Promise<{ success: boolean; error?: string; userId?: string }> {
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
    .select('role, phone')
    .eq('id', user.id)
    .single()

  // Super admins can manage all stations
  if (userData?.role === 'super_admin') {
    return { success: true, userId: user.id }
  }

  // Check if user is a station manager by phone number
  if (userData?.phone) {
    const { data: manager } = await supabase
      .from('wheel_station_managers')
      .select('id')
      .eq('station_id', stationId)
      .eq('phone', userData.phone)
      .single()

    if (manager) {
      return { success: true, userId: user.id }
    }
  }

  return { success: false, error: 'Forbidden - Station manager only' }
}

// POST - Import wheels from JSON array (frontend parses Excel to JSON)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { stationId } = await params

    const auth = await verifyManager(stationId)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
    }

    // Verify station exists
    const { data: station, error: stationError } = await supabase
      .from('wheel_stations')
      .select('id')
      .eq('id', stationId)
      .single()

    if (stationError || !station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 })
    }

    const body = await request.json()
    const { wheels: rawWheels, replace_existing } = body as { wheels: Record<string, unknown>[]; replace_existing?: boolean }

    if (!rawWheels || !Array.isArray(rawWheels) || rawWheels.length === 0) {
      return NextResponse.json({ error: 'No wheels data provided' }, { status: 400 })
    }

    // Normalize Hebrew column names to English
    const wheels = rawWheels.map(normalizeWheelData)

    // Validate each wheel
    const validationErrors: string[] = []
    wheels.forEach((wheel, index) => {
      if (!wheel.wheel_number) {
        validationErrors.push(`שורה ${index + 1}: חסר מספר גלגל`)
      }
      if (!wheel.rim_size) {
        validationErrors.push(`שורה ${index + 1}: חסר גודל ג'אנט`)
      }
      if (!wheel.bolt_count) {
        validationErrors.push(`שורה ${index + 1}: חסר כמות ברגים`)
      }
      if (!wheel.bolt_spacing) {
        validationErrors.push(`שורה ${index + 1}: חסר מרווח ברגים`)
      }
    })

    if (validationErrors.length > 0) {
      return NextResponse.json({
        error: 'Validation errors',
        details: validationErrors.slice(0, 10) // Return first 10 errors
      }, { status: 400 })
    }

    // If replace_existing is true, delete all existing wheels first
    if (replace_existing) {
      // Check if any wheels are currently borrowed
      const { data: borrowedWheels } = await supabase
        .from('wheels')
        .select('id, wheel_number')
        .eq('station_id', stationId)
        .eq('is_available', false)

      if (borrowedWheels && borrowedWheels.length > 0) {
        return NextResponse.json({
          error: 'Cannot replace wheels while some are borrowed',
          borrowed_wheels: borrowedWheels.map(w => w.wheel_number)
        }, { status: 400 })
      }

      // Delete existing wheels
      await supabase
        .from('wheels')
        .delete()
        .eq('station_id', stationId)
    }

    // Prepare wheels for insert
    const wheelsToInsert = wheels.map(wheel => ({
      station_id: stationId,
      wheel_number: String(wheel.wheel_number), // Convert to string (supports alphanumeric like "A23")
      rim_size: String(wheel.rim_size).replace('"', ''), // Remove " if present
      bolt_count: wheel.bolt_count,
      bolt_spacing: wheel.bolt_spacing,
      category: wheel.category || null,
      is_donut: wheel.is_donut || false,
      notes: wheel.notes || null,
      is_available: true
    }))

    // Insert wheels
    const { data: insertedWheels, error: insertError } = await supabase
      .from('wheels')
      .insert(wheelsToInsert)
      .select()

    if (insertError) {
      console.error('Error importing wheels:', insertError)
      if (insertError.code === '23505') {
        return NextResponse.json({
          error: 'Duplicate wheel numbers found',
          details: 'Some wheel numbers already exist in this station'
        }, { status: 400 })
      }
      return NextResponse.json({ error: 'Failed to import wheels' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      imported: insertedWheels?.length || 0,
      message: `Successfully imported ${insertedWheels?.length || 0} wheels`
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST import:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
