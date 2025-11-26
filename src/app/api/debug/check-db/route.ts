/**
 * Debug API: Check Supabase Database Configuration
 * GET /api/debug/check-db
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createServiceClient()
    const results: any = {
      timestamp: new Date().toISOString(),
      checks: {}
    }

    // Check 1: Users table
    try {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, role, is_active')
        .limit(10)

      results.checks.users = {
        success: !usersError,
        error: usersError?.message,
        count: users?.length || 0,
        users: users?.map(u => ({
          email: u.email,
          role: u.role,
          is_active: u.is_active
        })) || []
      }
    } catch (error: any) {
      results.checks.users = {
        success: false,
        error: error.message
      }
    }

    // Check 2: Cities table
    try {
      const { data: cities, error: citiesError } = await supabase
        .from('cities')
        .select('id, name, is_active')
        .limit(10)

      results.checks.cities = {
        success: !citiesError,
        error: citiesError?.message,
        count: cities?.length || 0,
        cities: cities?.map(c => ({
          id: c.id,
          name: c.name,
          is_active: c.is_active
        })) || []
      }
    } catch (error: any) {
      results.checks.cities = {
        success: false,
        error: error.message
      }
    }

    // Check 3: City Equipment table (new structure)
    try {
      const { data: cityEquipment, error: ceError } = await supabase
        .from('city_equipment')
        .select('id, city_id, global_equipment_id, quantity')
        .limit(5)

      results.checks.cityEquipment = {
        success: !ceError,
        error: ceError?.message,
        count: cityEquipment?.length || 0
      }
    } catch (error: any) {
      results.checks.cityEquipment = {
        success: false,
        error: error.message
      }
    }

    // Check 3b: Global Equipment Pool
    try {
      const { data: globalEquipment, error: geError } = await supabase
        .from('global_equipment_pool')
        .select('id, name, status')
        .eq('status', 'active')
        .limit(5)

      results.checks.globalEquipment = {
        success: !geError,
        error: geError?.message,
        count: globalEquipment?.length || 0
      }
    } catch (error: any) {
      results.checks.globalEquipment = {
        success: false,
        error: error.message
      }
    }

    // Check 4: Super Admin exists
    try {
      const { data: superAdmins, error: superError } = await supabase
        .from('users')
        .select('id, email, full_name, role, is_active')
        .eq('role', 'super_admin')

      results.checks.superAdmin = {
        success: !superError,
        error: superError?.message,
        exists: (superAdmins?.length || 0) > 0,
        count: superAdmins?.length || 0,
        admins: superAdmins?.map(a => ({
          email: a.email,
          full_name: a.full_name,
          is_active: a.is_active
        })) || []
      }
    } catch (error: any) {
      results.checks.superAdmin = {
        success: false,
        error: error.message
      }
    }

    // Check 5: Auth users
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers()

      results.checks.authUsers = {
        success: !authError,
        error: authError?.message,
        count: authData?.users?.length || 0,
        users: authData?.users?.map(u => ({
          email: u.email,
          role: u.user_metadata?.role || 'NOT SET',
          created_at: u.created_at
        })) || []
      }
    } catch (error: any) {
      results.checks.authUsers = {
        success: false,
        error: error.message
      }
    }

    // Summary
    results.summary = {
      allChecksSuccessful: Object.values(results.checks).every((check: any) => check.success),
      hasSuperAdmin: results.checks.superAdmin?.exists || false,
      totalUsers: results.checks.users?.count || 0,
      totalCities: results.checks.cities?.count || 0,
      totalCityEquipment: results.checks.cityEquipment?.count || 0,
      totalGlobalEquipment: results.checks.globalEquipment?.count || 0
    }

    return NextResponse.json({
      success: true,
      ...results
    })
  } catch (error: any) {
    console.error('Error checking database:', error)
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
