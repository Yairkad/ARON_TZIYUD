import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer, createServiceClient } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'
import { logEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const {
      name,
      manager1_name,
      manager1_phone,
      manager1_email,
      manager2_name,
      manager2_phone,
      manager2_email,
      location_url,
      token_location_url
    } = await request.json()

    console.log('Add city request:', { name, manager1_name, manager1_phone, manager2_name, manager2_phone, location_url, token_location_url })

    if (!name || !manager1_name || !manager1_phone) {
      return NextResponse.json(
        { error: 'אנא מלא את כל השדות החובה (שם עיר, מנהל ראשון, טלפון)' },
        { status: 400 }
      )
    }

    // Check if city with this name already exists
    const { data: existingCity } = await supabaseServer
      .from('cities')
      .select('id, name')
      .eq('name', name)
      .single()

    if (existingCity) {
      return NextResponse.json(
        { error: `עיר בשם "${name}" כבר קיימת במערכת` },
        { status: 409 }
      )
    }

    if (manager1_phone.length !== 10) {
      return NextResponse.json(
        { error: 'טלפון מנהל ראשון חייב להיות בן 10 ספרות' },
        { status: 400 }
      )
    }

    if (manager2_phone && manager2_phone.length !== 10) {
      return NextResponse.json(
        { error: 'טלפון מנהל שני חייב להיות בן 10 ספרות (או השאר ריק)' },
        { status: 400 }
      )
    }

    // הוספת העיר
    const { data, error } = await supabaseServer
      .from('cities')
      .insert([{
        name,
        manager1_name,
        manager1_phone,
        manager2_name: manager2_name || null,
        manager2_phone: manager2_phone || null,
        location_url: location_url || null,
        token_location_url: token_location_url || null,
        is_active: true
      }])
      .select()

    if (error) {
      console.error('Error adding city - Full error:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { error: `שגיאה בהוספת העיר: ${error.message || error.code || 'Unknown error'}` },
        { status: 500 }
      )
    }

    console.log('City added successfully:', data)
    const newCity = data[0]
    const createdUsers: any[] = []

    // Auto-create user for manager1 if email is provided
    if (manager1_email && newCity) {
      const serviceClient = createServiceClient()

      // Check if user with this email already exists
      const { data: existingUser } = await serviceClient
        .from('users')
        .select('id, email')
        .eq('email', manager1_email)
        .single()

      if (!existingUser) {
        // Generate a random password
        const tempPassword = Math.random().toString(36).slice(-8) + 'A1!'

        // Create user in Supabase Auth
        const { data: authData, error: createError } = await serviceClient.auth.admin.createUser({
          email: manager1_email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: manager1_name,
            role: 'city_manager',
            city_id: newCity.id,
            permissions: 'full_access',
            phone: manager1_phone,
            manager_role: 'manager1',
          },
        })

        if (!createError && authData.user) {
          // Wait for trigger to create user in public.users
          await new Promise(resolve => setTimeout(resolve, 500))

          // Link user to city as manager1 and sync name/phone
          await serviceClient
            .from('cities')
            .update({
              manager1_user_id: authData.user.id,
              manager1_name: manager1_name,
              manager1_phone: manager1_phone
            })
            .eq('id', newCity.id)

          // Send password reset email via Supabase
          const { error: resetError } = await serviceClient.auth.resetPasswordForEmail(
            manager1_email,
            {
              redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`
            }
          )

          // Log the email
          await logEmail({
            recipientEmail: manager1_email,
            recipientName: manager1_name,
            emailType: 'welcome',
            subject: 'הגדרת סיסמה - ארון ציוד ידידים',
            status: resetError ? 'failed' : 'sent',
            errorMessage: resetError?.message,
            sentBy: 'system',
            metadata: {
              user_id: authData.user.id,
              city_id: newCity.id,
              city_name: name,
              manager_role: 'manager1'
            }
          })

          if (resetError) {
            console.error('Error sending password reset email to manager1:', resetError)
          }

          createdUsers.push({
            email: manager1_email,
            name: manager1_name,
            role: 'manager1',
            emailSent: !resetError
          })
        } else {
          console.error('Error creating manager1 user:', createError)
        }
      } else {
        // User exists, link them to the city and sync name/phone
        await serviceClient
          .from('cities')
          .update({
            manager1_user_id: existingUser.id,
            manager1_name: manager1_name,
            manager1_phone: manager1_phone
          })
          .eq('id', newCity.id)

        // Also update the user's details in users table to match
        await serviceClient
          .from('users')
          .update({
            full_name: manager1_name,
            phone: manager1_phone,
            city_id: newCity.id,
            manager_role: 'manager1',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUser.id)
      }
    }

    // Auto-create user for manager2 if email is provided
    if (manager2_email && manager2_name && newCity) {
      const serviceClient = createServiceClient()

      // Check if user with this email already exists
      const { data: existingUser } = await serviceClient
        .from('users')
        .select('id, email')
        .eq('email', manager2_email)
        .single()

      if (!existingUser) {
        // Generate a random password
        const tempPassword = Math.random().toString(36).slice(-8) + 'A1!'

        // Create user in Supabase Auth
        const { data: authData, error: createError } = await serviceClient.auth.admin.createUser({
          email: manager2_email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: manager2_name,
            role: 'city_manager',
            city_id: newCity.id,
            permissions: 'full_access',
            phone: manager2_phone || null,
            manager_role: 'manager2',
          },
        })

        if (!createError && authData.user) {
          // Wait for trigger to create user in public.users
          await new Promise(resolve => setTimeout(resolve, 500))

          // Link user to city as manager2 and sync name/phone
          await serviceClient
            .from('cities')
            .update({
              manager2_user_id: authData.user.id,
              manager2_name: manager2_name,
              manager2_phone: manager2_phone || null
            })
            .eq('id', newCity.id)

          // Send password reset email via Supabase
          const { error: resetError } = await serviceClient.auth.resetPasswordForEmail(
            manager2_email,
            {
              redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`
            }
          )

          // Log the email
          await logEmail({
            recipientEmail: manager2_email,
            recipientName: manager2_name,
            emailType: 'welcome',
            subject: 'הגדרת סיסמה - ארון ציוד ידידים',
            status: resetError ? 'failed' : 'sent',
            errorMessage: resetError?.message,
            sentBy: 'system',
            metadata: {
              user_id: authData.user.id,
              city_id: newCity.id,
              city_name: name,
              manager_role: 'manager2'
            }
          })

          if (resetError) {
            console.error('Error sending password reset email to manager2:', resetError)
          }

          createdUsers.push({
            email: manager2_email,
            name: manager2_name,
            role: 'manager2',
            emailSent: !resetError
          })
        } else {
          console.error('Error creating manager2 user:', createError)
        }
      } else {
        // User exists, link them to the city and sync name/phone
        await serviceClient
          .from('cities')
          .update({
            manager2_user_id: existingUser.id,
            manager2_name: manager2_name,
            manager2_phone: manager2_phone || null
          })
          .eq('id', newCity.id)

        // Also update the user's details in users table to match
        await serviceClient
          .from('users')
          .update({
            full_name: manager2_name,
            phone: manager2_phone || null,
            city_id: newCity.id,
            manager_role: 'manager2',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUser.id)
      }
    }

    let message = 'העיר נוספה בהצלחה'
    if (createdUsers.length > 0) {
      const emailsSent = createdUsers.filter((u: any) => u.emailSent).length
      message += `. נוצרו ${createdUsers.length} משתמשים חדשים`
      if (emailsSent > 0) {
        message += ` - נשלחו ${emailsSent} מיילים עם לינק להגדרת סיסמה`
      }
    }

    return NextResponse.json({
      success: true,
      message,
      city: data,
      createdUsers: createdUsers.length > 0 ? createdUsers : undefined
    })
  } catch (error) {
    console.error('Add city error - Full error:', error)
    return NextResponse.json(
      { error: `שגיאה בתהליך הוספת העיר: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
