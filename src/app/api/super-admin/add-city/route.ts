import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer, createServiceClient } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'
import { logEmail } from '@/lib/email'
import { generateSlug } from '@/lib/city-url'

/**
 * Extract coordinates from a Google Maps URL
 */
function extractCoordinatesFromUrl(url: string): { lat: number; lng: number } | null {
  if (!url) return null

  try {
    // Pattern 1: /@lat,lng,zoom format
    const pattern1 = /@(-?\d+\.?\d*),(-?\d+\.?\d*),/
    const match1 = url.match(pattern1)
    if (match1) {
      return {
        lat: parseFloat(match1[1]),
        lng: parseFloat(match1[2])
      }
    }

    // Pattern 2: ?q=lat,lng format
    const pattern2 = /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/
    const match2 = url.match(pattern2)
    if (match2) {
      return {
        lat: parseFloat(match2[1]),
        lng: parseFloat(match2[2])
      }
    }

    // Pattern 3: /place/.../@lat,lng format
    const pattern3 = /\/place\/[^/]+\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/
    const match3 = url.match(pattern3)
    if (match3) {
      return {
        lat: parseFloat(match3[1]),
        lng: parseFloat(match3[2])
      }
    }

    // Pattern 4: ll=lat,lng format
    const pattern4 = /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/
    const match4 = url.match(pattern4)
    if (match4) {
      return {
        lat: parseFloat(match4[1]),
        lng: parseFloat(match4[2])
      }
    }

    return null
  } catch (error) {
    console.error('Error extracting coordinates:', error)
    return null
  }
}

/**
 * Expand short URL and extract coordinates
 */
async function expandAndExtractCoords(url: string): Promise<{ lat: number; lng: number } | null> {
  if (!url) return null

  try {
    // Check if this is a short URL that needs expansion
    const isShortUrl = url.includes('maps.app.goo.gl') ||
                       url.includes('goo.gl/maps') ||
                       url.includes('app.goo.gl')

    let urlToProcess = url

    if (isShortUrl) {
      // Expand the short URL by following redirects (GET works more reliably than HEAD)
      try {
        const response = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })
        urlToProcess = response.url
      } catch (fetchError) {
        console.error('Error expanding URL:', fetchError)
        // Fall through to try extracting from original URL
      }
    }

    // Extract coordinates from the URL
    return extractCoordinatesFromUrl(urlToProcess)
  } catch (error) {
    console.error('Error in expandAndExtractCoords:', error)
    return null
  }
}

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

    // Try to extract coordinates from token_location_url for map display
    let token_lat: number | null = null
    let token_lng: number | null = null
    let public_lat: number | null = null
    let public_lng: number | null = null

    if (token_location_url) {
      const coords = await expandAndExtractCoords(token_location_url)
      if (coords) {
        token_lat = coords.lat
        token_lng = coords.lng
        // Also set public coordinates for map display
        public_lat = coords.lat
        public_lng = coords.lng
        console.log(`Extracted coordinates from token_location_url: ${token_lat}, ${token_lng}`)
      }
    }

    // Generate slug from city name (Hebrew name with hyphens)
    const slug = generateSlug(name)

    // הוספת העיר
    const { data, error } = await supabaseServer
      .from('cities')
      .insert([{
        name,
        slug,
        manager1_name,
        manager1_phone,
        manager2_name: manager2_name || null,
        manager2_phone: manager2_phone || null,
        location_url: location_url || null,
        token_location_url: token_location_url || null,
        token_lat,
        token_lng,
        public_lat,
        public_lng,
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

      // Check if user with this email already exists in public.users
      const { data: existingUser } = await serviceClient
        .from('users')
        .select('id, email')
        .eq('email', manager1_email)
        .single()

      // Also check if user exists in auth.users (might exist there but not in public.users)
      const { data: authUsers } = await serviceClient.auth.admin.listUsers()
      const existingAuthUser = authUsers?.users?.find(u => u.email === manager1_email)

      if (!existingUser && !existingAuthUser) {
        // User doesn't exist anywhere - create new user
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
          // Create user in public.users table directly (don't rely on trigger)
          const { error: insertUserError } = await serviceClient
            .from('users')
            .upsert({
              id: authData.user.id,
              email: manager1_email,
              role: 'city_manager',
              city_id: newCity.id,
              full_name: manager1_name,
              phone: manager1_phone,
              permissions: 'full_access',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' })

          if (insertUserError) {
            console.error('Error inserting manager1 to users table:', insertUserError)
          } else {
            console.log('✅ Manager1 user created in public.users:', authData.user.id)
          }

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
      } else if (existingAuthUser && !existingUser) {
        // User exists in auth but not in public.users - fix the gap
        console.log('Manager1 exists in auth but not in users table, creating entry...')

        // Create the missing entry in public.users
        const { error: insertUserError } = await serviceClient
          .from('users')
          .upsert({
            id: existingAuthUser.id,
            email: manager1_email,
            role: 'city_manager',
            city_id: newCity.id,
            full_name: manager1_name,
            phone: manager1_phone,
            permissions: 'full_access',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' })

        if (insertUserError) {
          console.error('Error inserting manager1 to users table:', insertUserError)
        } else {
          console.log('✅ Manager1 user added to public.users:', existingAuthUser.id)
        }

        // Link user to city as manager1
        await serviceClient
          .from('cities')
          .update({
            manager1_user_id: existingAuthUser.id,
            manager1_name: manager1_name,
            manager1_phone: manager1_phone
          })
          .eq('id', newCity.id)
      } else {
        // User exists in public.users, link them to the city and sync name/phone
        const userId = existingUser?.id || existingAuthUser?.id
        await serviceClient
          .from('cities')
          .update({
            manager1_user_id: userId,
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
          .eq('id', userId)
      }
    }

    // Auto-create user for manager2 if email is provided
    if (manager2_email && manager2_name && newCity) {
      const serviceClient = createServiceClient()

      // Check if user with this email already exists in public.users
      const { data: existingUser } = await serviceClient
        .from('users')
        .select('id, email')
        .eq('email', manager2_email)
        .single()

      // Also check if user exists in auth.users (might exist there but not in public.users)
      const { data: authUsers } = await serviceClient.auth.admin.listUsers()
      const existingAuthUser = authUsers?.users?.find(u => u.email === manager2_email)

      if (!existingUser && !existingAuthUser) {
        // User doesn't exist anywhere - create new user
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
          // Create user in public.users table directly (don't rely on trigger)
          const { error: insertUserError } = await serviceClient
            .from('users')
            .upsert({
              id: authData.user.id,
              email: manager2_email,
              role: 'city_manager',
              city_id: newCity.id,
              full_name: manager2_name,
              phone: manager2_phone || null,
              permissions: 'full_access',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' })

          if (insertUserError) {
            console.error('Error inserting manager2 to users table:', insertUserError)
          } else {
            console.log('✅ Manager2 user created in public.users:', authData.user.id)
          }

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
      } else if (existingAuthUser && !existingUser) {
        // User exists in auth but not in public.users - fix the gap
        console.log('Manager2 exists in auth but not in users table, creating entry...')

        // Create the missing entry in public.users
        const { error: insertUserError } = await serviceClient
          .from('users')
          .upsert({
            id: existingAuthUser.id,
            email: manager2_email,
            role: 'city_manager',
            city_id: newCity.id,
            full_name: manager2_name,
            phone: manager2_phone || null,
            permissions: 'full_access',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' })

        if (insertUserError) {
          console.error('Error inserting manager2 to users table:', insertUserError)
        } else {
          console.log('✅ Manager2 user added to public.users:', existingAuthUser.id)
        }

        // Link user to city as manager2
        await serviceClient
          .from('cities')
          .update({
            manager2_user_id: existingAuthUser.id,
            manager2_name: manager2_name,
            manager2_phone: manager2_phone || null
          })
          .eq('id', newCity.id)
      } else {
        // User exists in public.users, link them to the city and sync name/phone
        const userId = existingUser?.id || existingAuthUser?.id
        await serviceClient
          .from('cities')
          .update({
            manager2_user_id: userId,
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
          .eq('id', userId)
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
