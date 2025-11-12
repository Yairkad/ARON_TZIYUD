/**
 * API Route: Select City
 * POST /api/user/select-city
 *
 * Sets the selected city in the user's session
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

interface SelectCityBody {
  cityId: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const accessToken = request.cookies.get('sb-access-token')?.value

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'לא מורשה - נדרשת התחברות' },
        { status: 401 }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'לא מורשה - נדרשת התחברות' },
        { status: 401 }
      )
    }

    const body: SelectCityBody = await request.json()

    if (!body.cityId) {
      return NextResponse.json(
        { success: false, error: 'חסר מזהה עיר' },
        { status: 400 }
      )
    }

    // Get user's role
    const { data: userProfile } = await supabase
      .from('users')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (!userProfile || !userProfile.is_active) {
      return NextResponse.json(
        { success: false, error: 'משתמש לא פעיל' },
        { status: 403 }
      )
    }

    // Super admin can access any city
    if (userProfile.role === 'super_admin') {
      // Verify city exists
      const { data: city, error: cityError } = await supabase
        .from('cities')
        .select('id, name')
        .eq('id', body.cityId)
        .single()

      if (cityError || !city) {
        return NextResponse.json(
          { success: false, error: 'עיר לא נמצאה' },
          { status: 404 }
        )
      }

      // Create response with cookie
      const response = NextResponse.json({
        success: true,
        message: 'העיר נבחרה בהצלחה',
        city: city
      })

      // Set selected city in cookie (valid for 7 days)
      response.cookies.set('selected-city-id', body.cityId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
      })

      return response
    }

    // City manager - verify they have access to this city
    const { data: userCity, error: userCityError } = await supabase
      .from('user_cities')
      .select('*, city:cities(*)')
      .eq('user_id', user.id)
      .eq('city_id', body.cityId)
      .single()

    if (userCityError || !userCity) {
      return NextResponse.json(
        { success: false, error: 'אין לך הרשאה לעיר זו' },
        { status: 403 }
      )
    }

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      message: 'העיר נבחרה בהצלחה',
      city: userCity.city
    })

    // Set selected city in cookie (valid for 7 days)
    response.cookies.set('selected-city-id', body.cityId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Error in select city API:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאת שרת פנימית' },
      { status: 500 }
    )
  }
}
