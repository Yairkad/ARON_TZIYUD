import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer, createServiceClient } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'

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
      token_location_url,
      password
    } = await request.json()

    console.log('Add city request:', { name, manager1_name, manager1_phone, manager2_name, manager2_phone, location_url, token_location_url })

    if (!name || !manager1_name || !manager1_phone || !password) {
      return NextResponse.json(
        { error: 'אנא מלא את כל השדות החובה (שם עיר, מנהל ראשון, טלפון, סיסמה)' },
        { status: 400 }
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

    // הצפנת הסיסמה
    const hashedPassword = await bcrypt.hash(password, 10)

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
        password: hashedPassword,
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

          // Link user to city as manager1
          await serviceClient
            .from('cities')
            .update({
              manager1_user_id: authData.user.id
            })
            .eq('id', newCity.id)

          createdUsers.push({
            email: manager1_email,
            password: tempPassword,
            role: 'manager1'
          })

          // Send welcome email
          try {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/welcome`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: manager1_email,
                name: manager1_name,
                password: tempPassword,
                role: 'city_manager',
              }),
            })
          } catch (emailError) {
            console.error('Error sending welcome email to manager1:', emailError)
          }
        } else {
          console.error('Error creating manager1 user:', createError)
        }
      } else {
        // User exists, link them to the city
        await serviceClient
          .from('cities')
          .update({
            manager1_user_id: existingUser.id
          })
          .eq('id', newCity.id)
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

          // Link user to city as manager2
          await serviceClient
            .from('cities')
            .update({
              manager2_user_id: authData.user.id
            })
            .eq('id', newCity.id)

          createdUsers.push({
            email: manager2_email,
            password: tempPassword,
            role: 'manager2'
          })

          // Send welcome email
          try {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/welcome`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: manager2_email,
                name: manager2_name,
                password: tempPassword,
                role: 'city_manager',
              }),
            })
          } catch (emailError) {
            console.error('Error sending welcome email to manager2:', emailError)
          }
        } else {
          console.error('Error creating manager2 user:', createError)
        }
      } else {
        // User exists, link them to the city
        await serviceClient
          .from('cities')
          .update({
            manager2_user_id: existingUser.id
          })
          .eq('id', newCity.id)
      }
    }

    let message = 'העיר נוספה בהצלחה'
    if (createdUsers.length > 0) {
      message += `. נוצרו ${createdUsers.length} משתמשים חדשים - סיסמאות זמניות נשלחו במייל`
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
