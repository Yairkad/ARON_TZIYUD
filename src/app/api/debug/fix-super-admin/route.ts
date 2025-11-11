/**
 * Debug API Route: Fix Super Admin User
 * GET /api/debug/fix-super-admin
 *
 * Adds super admin to public.users table if missing
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    // Get all users from auth
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch auth users',
        details: authError
      }, { status: 500 })
    }

    // Find super admin user
    const superAdmin = authUsers.find(u => u.email === 'yk74re@gmail.com')

    if (!superAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Super admin user not found in auth.users'
      }, { status: 404 })
    }

    console.log('✅ Found user in auth.users:', superAdmin.id)

    // Check if exists in public.users
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', superAdmin.id)
      .single()

    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: 'User already exists in public.users',
        user: existingUser
      })
    }

    console.log('➕ User not found in public.users, adding...')

    // Insert into public.users
    const { data: insertedUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: superAdmin.id,
        email: superAdmin.email,
        full_name: 'Super Admin',
        role: 'super_admin',
        is_active: true,
        permissions: 'full_access',
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to insert user into public.users',
        details: insertError
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully added user to public.users',
      user: insertedUser
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
