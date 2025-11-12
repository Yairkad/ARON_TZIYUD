/**
 * Debug API: Preview Manager Migration
 * GET /api/debug/preview-migration
 *
 * Shows what managers would be created without actually creating them
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

function createEmailForManager(cityName: string, cityId: string, managerRole: 'manager1' | 'manager2'): string {
  // Create unique email using city name: beitshemesh-manager1@aron.local
  const cleanName = cityName
    .toLowerCase()
    .replace(/\s+/g, '')  // Remove spaces
    .replace(/[^\u0590-\u05FFa-z0-9]/g, '')  // Keep only Hebrew, English, and numbers
    .substring(0, 20)  // Limit length

  // Add first 8 chars of UUID to ensure uniqueness
  const shortId = cityId.substring(0, 8)
  return `${cleanName}-${shortId}-${managerRole}@aron.local`
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
          email_will_be: createEmailForManager(city.name, city.id, 'manager1'),
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
          email_will_be: createEmailForManager(city.name, city.id, 'manager2'),
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
