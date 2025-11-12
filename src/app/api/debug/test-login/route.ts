/**
 * Debug API Route: Test Login
 * GET /api/debug/test-login
 *
 * Tests login with super admin credentials and provides detailed debug info
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const results: any = {
    steps: [],
    success: false
  }

  try {
    const supabase = createServiceClient()

    // Step 1: Check if user exists in auth.users
    results.steps.push('Step 1: Checking auth.users...')
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      results.steps.push(`❌ Error listing users: ${listError.message}`)
      return NextResponse.json(results)
    }

    const authUser = users.find(u => u.email === 'yk74re@gmail.com')

    if (!authUser) {
      results.steps.push('❌ User NOT found in auth.users')
      results.recommendation = 'Need to create user via Supabase Admin API'
      return NextResponse.json(results)
    }

    results.steps.push(`✅ User found in auth.users (ID: ${authUser.id})`)
    results.authUser = {
      id: authUser.id,
      email: authUser.email,
      email_confirmed: authUser.email_confirmed_at ? 'Yes' : 'No',
      created_at: authUser.created_at,
      metadata: authUser.user_metadata
    }

    // Step 2: Check if user exists in public.users
    results.steps.push('Step 2: Checking public.users...')
    const { data: publicUser, error: publicError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (publicError || !publicUser) {
      results.steps.push('❌ User NOT found in public.users')
      results.recommendation = 'Need to add user to public.users table'
    } else {
      results.steps.push('✅ User found in public.users')
      results.publicUser = publicUser
    }

    // Step 3: Try to login with the credentials
    results.steps.push('Step 3: Testing login with password...')
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'yk74re@gmail.com',
      password: 'Admin2025'
    })

    if (loginError) {
      results.steps.push(`❌ Login FAILED: ${loginError.message}`)
      results.loginError = loginError.message

      if (loginError.message.includes('Invalid login credentials')) {
        results.recommendation = 'Password hash is incompatible. User was likely created with SQL crypt() instead of Supabase Admin API. Need to recreate user properly.'
      }
    } else {
      results.steps.push('✅ Login SUCCESSFUL!')
      results.success = true
      results.session = {
        access_token: loginData.session?.access_token ? 'Present' : 'Missing',
        refresh_token: loginData.session?.refresh_token ? 'Present' : 'Missing',
        user_id: loginData.user?.id
      }
    }

    return NextResponse.json(results)

  } catch (error) {
    results.steps.push(`❌ Exception: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return NextResponse.json(results, { status: 500 })
  }
}
