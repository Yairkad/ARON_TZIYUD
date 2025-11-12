/**
 * Debug API: Preview Manager Migration
 * GET /api/debug/preview-migration
 *
 * Shows what managers would be created without actually creating them
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

function createEmailForManager(cityId: string, managerRole: 'manager1' | 'manager2'): string {
  return `${cityId}-${managerRole}@aron.local`
}

export async function GET() {
  try {
    const supabase = createServiceClient()

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
          email_will_be: createEmailForManager(city.id, 'manager1'),
          password_will_be: '123456'
        })
        totalManagers++
      }

      // Manager 2
      if (city.manager2_name && city.manager2_phone) {
        cityPreview.managers.push({
          name: city.manager2_name,
          phone: city.manager2_phone,
          role: 'manager2',
          email_will_be: createEmailForManager(city.id, 'manager2'),
          password_will_be: '123456'
        })
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
