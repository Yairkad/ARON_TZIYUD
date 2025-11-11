/**
 * Bootstrap API: Create First Super Admin
 * POST /api/bootstrap/create-first-admin
 *
 * This endpoint creates the very first super admin user
 * It requires a secret key from environment variables
 * Should only be used once during initial setup
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { secret, email, password } = await request.json()

    // Verify secret key (set this in Vercel environment variables)
    const BOOTSTRAP_SECRET = process.env.BOOTSTRAP_SECRET || 'your-secret-key-here'

    if (secret !== BOOTSTRAP_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Invalid secret key' },
        { status: 403 }
      )
    }

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password required' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Check if any super admin already exists
    const { data: existingAdmins } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'super_admin')
      .limit(1)

    if (existingAdmins && existingAdmins.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Super admin already exists. Use normal user creation API.' },
        { status: 400 }
      )
    }

    // Create user via Supabase Auth Admin API (this properly hashes the password)
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: 'Super Admin',
        role: 'super_admin',
        permissions: 'full_access',
      },
    })

    if (createError || !authData.user) {
      console.error('Error creating super admin:', createError)
      return NextResponse.json(
        { success: false, error: `Failed to create user: ${createError?.message}` },
        { status: 500 }
      )
    }

    // Wait for trigger to create public.users entry
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Verify user was created in public.users
    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    return NextResponse.json({
      success: true,
      message: 'Super admin created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: userProfile?.role,
      },
    })

  } catch (error) {
    console.error('Bootstrap error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
