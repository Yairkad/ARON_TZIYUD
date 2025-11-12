/**
 * Debug API: Migrate City Managers to Users
 * POST /api/debug/migrate-managers
 *
 * Creates user accounts for all city managers found in cities table
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// Temporary default password for all managers
const DEFAULT_PASSWORD = '123456'

// Global counter for admin emails
let adminCounter = 1

function createEmailForManager(): string {
  // Create simple sequential email: admin1@aron.local, admin2@aron.local, etc.
  const email = `admin${adminCounter}@aron.local`
  adminCounter++
  return email
}

export async function POST(request: Request) {
  try {
    const supabase = createServiceClient()
    const results: any = {
      timestamp: new Date().toISOString(),
      processed: [],
      errors: [],
      summary: {
        total: 0,
        success: 0,
        skipped: 0,
        failed: 0
      }
    }

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

    console.log(`Found ${cities.length} cities to process`)

    // Process each city
    for (const city of cities) {
      results.summary.total++

      const managers = []

      // Manager 1
      if (city.manager1_name && city.manager1_phone) {
        managers.push({
          name: city.manager1_name,
          phone: city.manager1_phone,
          role: 'manager1' as const
        })
      }

      // Manager 2
      if (city.manager2_name && city.manager2_phone) {
        managers.push({
          name: city.manager2_name,
          phone: city.manager2_phone,
          role: 'manager2' as const
        })
      }

      if (managers.length === 0) {
        results.processed.push({
          city: city.name,
          status: 'skipped',
          reason: 'No managers found'
        })
        results.summary.skipped++
        continue
      }

      // Process each manager
      for (const manager of managers) {
        try {
          const email = createEmailForManager()
          const password = DEFAULT_PASSWORD

          // Check if user already exists in users table
          const { data: existingUser } = await supabase
            .from('users')
            .select('id, email')
            .eq('city_id', city.id)
            .eq('manager_role', manager.role)
            .single()

          if (existingUser) {
            results.processed.push({
              city: city.name,
              manager: manager.name,
              role: manager.role,
              email: existingUser.email,
              status: 'skipped',
              reason: 'User already exists'
            })
            results.summary.skipped++
            continue
          }

          // Create user in Supabase Auth
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
              full_name: manager.name,
              role: 'city_manager',
              city_id: city.id,
              permissions: 'full_access',
              phone: manager.phone,
              manager_role: manager.role
            }
          })

          if (authError) {
            results.errors.push({
              city: city.name,
              manager: manager.name,
              error: authError.message
            })
            results.summary.failed++
            continue
          }

          // Wait a bit for the trigger to create user in public.users
          await new Promise(resolve => setTimeout(resolve, 500))

          // Verify user was created in public.users
          const { data: newUser, error: userError } = await supabase
            .from('users')
            .select('id, email')
            .eq('id', authData.user.id)
            .single()

          if (userError || !newUser) {
            console.error('User created in Auth but not in users table:', userError)
            results.errors.push({
              city: city.name,
              manager: manager.name,
              error: 'User created in Auth but not synced to users table'
            })
            results.summary.failed++
            continue
          }

          results.processed.push({
            city: city.name,
            manager: manager.name,
            role: manager.role,
            email,
            password, // ⚠️ IMPORTANT: Save this password!
            status: 'created',
            user_id: authData.user.id
          })
          results.summary.success++

        } catch (error: any) {
          console.error(`Error processing manager ${manager.name} for city ${city.name}:`, error)
          results.errors.push({
            city: city.name,
            manager: manager.name,
            error: error.message
          })
          results.summary.failed++
        }
      }
    }

    return NextResponse.json({
      success: true,
      ...results
    })

  } catch (error: any) {
    console.error('Error migrating managers:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack
      },
      { status: 500 }
    )
  }
}
