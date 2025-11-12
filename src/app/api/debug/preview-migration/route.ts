/**
 * Debug API: Preview Manager Migration
 * GET /api/debug/preview-migration
 *
 * Shows what managers would be created without actually creating them
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

async function getNextAdminNumber(supabase: any): Promise<number> {
  // Get all existing admin emails to find the highest number
  const { data: existingUsers } = await supabase
    .from('users')
    .select('email')
    .like('email', 'admin%@aron.local')

  if (!existingUsers || existingUsers.length === 0) {
    return 1
  }

  // Extract numbers from emails like "admin5@aron.local" and find the max
  const numbers = existingUsers
    .map((u: any) => {
      const match = u.email.match(/^admin(\d+)@aron\.local$/)
      return match ? parseInt(match[1], 10) : 0
    })
    .filter((n: number) => n > 0)

  return numbers.length > 0 ? Math.max(...numbers) + 1 : 1
}

export async function GET() {
  try {
    const supabase = createServiceClient()

    // Get the next available admin number
    let adminCounter = await getNextAdminNumber(supabase)

    // Get all cities with managers
    const { data: cities, error: citiesError } = await supabase
      .from('cities')
      .select('*')

    if (citiesError) {
      return NextResponse.json({
        success: false,
        error: `Failed to fetch cities: ${citiesError.message}`
      }, { status: 500 })
    }

    const preview = []
    let totalManagers = 0

    for (const city of cities) {
      const cityPreview: any = {
        city_id: city.id,
        city_name: city.name,
        is_active: city.is_active,
        managers: []
      }

      // Manager 1
      if (city.manager1_name && city.manager1_phone) {
        cityPreview.managers.push({
          name: city.manager1_name,
          phone: city.manager1_phone,
          role: 'manager1',
          email_will_be: `admin${adminCounter}@aron.local`,
          password_will_be: '123456'
        })
        adminCounter++
        totalManagers++
      }

      // Manager 2
      if (city.manager2_name && city.manager2_phone) {
        cityPreview.managers.push({
          name: city.manager2_name,
          phone: city.manager2_phone,
          role: 'manager2',
          email_will_be: `admin${adminCounter}@aron.local`,
          password_will_be: '123456'
        })
        adminCounter++
        totalManagers++
      }

      if (cityPreview.managers.length > 0) {
        preview.push(cityPreview)
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total_cities: cities.length,
        cities_with_managers: preview.length,
        total_managers_to_create: totalManagers
      },
      preview
    })

  } catch (error: any) {
    console.error('Error previewing migration:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}
