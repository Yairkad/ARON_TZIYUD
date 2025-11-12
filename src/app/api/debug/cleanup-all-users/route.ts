/**
 * Debug API: Cleanup All City Manager Users
 * POST /api/debug/cleanup-all-users
 *
 * Deletes all city_manager users from both Auth and users table
 * Keeps super_admin users intact
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = createServiceClient()
    const results: any = {
      timestamp: new Date().toISOString(),
      deleted_from_auth: [],
      deleted_from_users: [],
      errors: [],
      summary: {
        auth_deleted: 0,
        users_deleted: 0,
        failed: 0
      }
    }

    // Get all city manager users from users table
    const { data: cityManagers, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .eq('role', 'city_manager')

    if (usersError) {
      return NextResponse.json({
        success: false,
        error: `Failed to fetch city managers: ${usersError.message}`
      }, { status: 500 })
    }

    console.log(`Found ${cityManagers?.length || 0} city managers in users table`)

    // Delete from Auth first
    if (cityManagers && cityManagers.length > 0) {
      for (const user of cityManagers) {
        try {
          console.log(`Deleting ${user.email} from Auth...`)
          const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)

          if (deleteError) {
            console.error(`Error deleting ${user.email} from Auth:`, deleteError)
            results.errors.push({
              email: user.email,
              error: deleteError.message,
              type: 'auth'
            })
            results.summary.failed++
          } else {
            results.deleted_from_auth.push({
              email: user.email,
              full_name: user.full_name
            })
            results.summary.auth_deleted++
            console.log(`✓ Deleted ${user.email} from Auth`)
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (error: any) {
          console.error(`Exception deleting ${user.email}:`, error)
          results.errors.push({
            email: user.email,
            error: error.message,
            type: 'auth_exception'
          })
          results.summary.failed++
        }
      }
    }

    // Also check Auth directly for any admin@aron.local emails
    const { data: authUsers, error: authListError } = await supabase.auth.admin.listUsers()

    if (!authListError && authUsers?.users) {
      console.log(`Found ${authUsers.users.length} total users in Auth`)

      for (const authUser of authUsers.users) {
        // Delete any admin@aron.local users that weren't in the users table
        if (authUser.email?.match(/^admin\d+@aron\.local$/) && authUser.user_metadata?.role === 'city_manager') {
          // Check if we already deleted this one
          const alreadyDeleted = results.deleted_from_auth.some((u: any) => u.email === authUser.email)

          if (!alreadyDeleted) {
            try {
              console.log(`Cleaning up orphaned Auth user: ${authUser.email}`)
              await supabase.auth.admin.deleteUser(authUser.id)
              results.deleted_from_auth.push({
                email: authUser.email,
                full_name: authUser.user_metadata?.full_name || 'Unknown',
                note: 'Orphaned in Auth (not in users table)'
              })
              results.summary.auth_deleted++
              await new Promise(resolve => setTimeout(resolve, 100))
            } catch (error: any) {
              results.errors.push({
                email: authUser.email,
                error: error.message,
                type: 'orphaned_auth'
              })
              results.summary.failed++
            }
          }
        }
      }
    }

    // Delete from users table (cascade should handle this, but just in case)
    const { error: deleteUsersError } = await supabase
      .from('users')
      .delete()
      .eq('role', 'city_manager')

    if (deleteUsersError) {
      console.error('Error deleting from users table:', deleteUsersError)
      results.errors.push({
        error: deleteUsersError.message,
        type: 'users_table'
      })
    } else {
      results.summary.users_deleted = cityManagers?.length || 0
      console.log(`✓ Deleted ${results.summary.users_deleted} records from users table`)
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup complete: ${results.summary.auth_deleted} from Auth, ${results.summary.users_deleted} from users table`,
      ...results
    })

  } catch (error: any) {
    console.error('Error in cleanup:', error)
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
