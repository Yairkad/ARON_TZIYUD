/**
 * Debug API Route: Create Super Admin
 * GET /api/debug/create-super-admin
 *
 * Creates super admin user properly via Supabase Admin API
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

    // Step 1: Delete existing user if exists
    results.steps.push('Step 1: Checking for existing user...')
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      results.steps.push(`❌ Error listing users: ${listError.message}`)
      return NextResponse.json(results, { status: 500 })
    }

    const existingUser = users.find(u => u.email === 'yk74re@gmail.com')

    if (existingUser) {
      results.steps.push(`Found existing user (ID: ${existingUser.id})`)
      results.steps.push('Deleting old user...')

      const { error: deleteError } = await supabase.auth.admin.deleteUser(existingUser.id)

      if (deleteError) {
        results.steps.push(`❌ Failed to delete: ${deleteError.message}`)
        return NextResponse.json(results, { status: 500 })
      }

      results.steps.push('✅ Old user deleted')
    } else {
      results.steps.push('No existing user found')
    }

    // Step 2: Create new user with Supabase Admin API
    results.steps.push('Step 2: Creating new super admin...')

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: 'yk74re@gmail.com',
      password: 'Admin2025',
      email_confirm: true,
      user_metadata: {
        role: 'super_admin',
        full_name: 'Super Admin',
        permissions: 'full_access'
      }
    })

    if (createError) {
      results.steps.push(`❌ Failed to create user: ${createError.message}`)
      return NextResponse.json(results, { status: 500 })
    }

    results.steps.push(`✅ User created in auth.users (ID: ${newUser.user.id})`)
    results.userId = newUser.user.id

    // Step 3: Wait a moment for trigger
    results.steps.push('Step 3: Waiting for trigger to fire...')
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Step 4: Check/Create public.users entry
    results.steps.push('Step 4: Checking public.users...')

    const { data: publicUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', newUser.user.id)
      .single()

    if (checkError || !publicUser) {
      results.steps.push('User not in public.users, creating...')

      const { data: insertedUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: newUser.user.id,
          email: 'yk74re@gmail.com',
          role: 'super_admin',
          full_name: 'Super Admin',
          is_active: true,
          permissions: 'full_access'
        })
        .select()
        .single()

      if (insertError) {
        results.steps.push(`❌ Failed to create public.users entry: ${insertError.message}`)
        return NextResponse.json(results, { status: 500 })
      }

      results.steps.push('✅ Entry created in public.users')
      results.publicUser = insertedUser
    } else {
      results.steps.push('✅ Entry already exists in public.users')
      results.publicUser = publicUser
    }

    // Step 5: Test login
    results.steps.push('Step 5: Testing login...')

    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'yk74re@gmail.com',
      password: 'Admin2025'
    })

    if (loginError) {
      results.steps.push(`❌ Login test FAILED: ${loginError.message}`)
      results.loginError = loginError.message
    } else {
      results.steps.push('✅ Login test SUCCESSFUL!')
      results.success = true
    }

    results.steps.push('')
    results.steps.push('═══════════════════════════════════════')
    results.steps.push(results.success ? '🎉 SUCCESS! You can now login!' : '❌ Something went wrong')
    results.steps.push('═══════════════════════════════════════')
    results.steps.push('Email: yk74re@gmail.com')
    results.steps.push('Password: Admin2025')

    return NextResponse.json(results)

  } catch (error) {
    results.steps.push(`❌ Exception: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return NextResponse.json(results, { status: 500 })
  }
}
