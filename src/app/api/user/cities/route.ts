/**
 * API Route: Get User's Cities
 * GET /api/user/cities
 *
 * Returns all cities assigned to the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
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

    // Super admin gets all cities
    if (userProfile.role === 'super_admin') {
      const { data: allCities, error: citiesError } = await supabase
        .from('cities')
        .select('*')
        .order('name')

      if (citiesError) {
        console.error('Error fetching all cities:', citiesError)
        return NextResponse.json(
          { success: false, error: 'שגיאה בטעינת ערים' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        cities: allCities.map(city => ({
          ...city,
          city_id: city.id
        }))
      })
    }

    // City manager gets their assigned cities
    const { data: userCities, error: userCitiesError } = await supabase
      .from('user_cities')
      .select(`
        *,
        city:cities(*)
      `)
      .eq('user_id', user.id)

    if (userCitiesError) {
      console.error('Error fetching user cities:', userCitiesError)
      return NextResponse.json(
        { success: false, error: 'שגיאה בטעינת ערים' },
        { status: 500 }
      )
    }

    if (!userCities || userCities.length === 0) {
      return NextResponse.json({
        success: true,
        cities: []
      })
    }

    // Format the response
    const cities = userCities.map(uc => ({
      ...uc.city,
      city_id: uc.city_id,
      manager_role: uc.manager_role
    }))

    return NextResponse.json({
      success: true,
      cities
    })

  } catch (error) {
    console.error('Error in get user cities API:', error)
    return NextResponse.json(
      { success: false, error: 'שגיאת שרת פנימית' },
      { status: 500 }
    )
  }
}
