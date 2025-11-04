import { NextRequest, NextResponse } from 'next/server'

// אימות session token
export async function GET(request: NextRequest) {
  const citySession = request.cookies.get('city_session')?.value
  const superAdminSession = request.cookies.get('super_admin_session')?.value

  if (!citySession && !superAdminSession) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    )
  }

  try {
    // פענוח הטוקן
    let sessionData
    if (citySession) {
      sessionData = JSON.parse(Buffer.from(citySession, 'base64').toString())
    } else if (superAdminSession) {
      sessionData = JSON.parse(Buffer.from(superAdminSession, 'base64').toString())
    }

    // בדיקת תקינות (אם הטוקן לא עבר 8 שעות)
    const now = Date.now()
    const sessionAge = now - sessionData.timestamp
    const maxAge = 8 * 60 * 60 * 1000 // 8 שעות

    if (sessionAge > maxAge) {
      return NextResponse.json(
        { authenticated: false, error: 'Session expired' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      authenticated: true,
      userId: sessionData.userId,
      userType: sessionData.userType
    })
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    )
  }
}
