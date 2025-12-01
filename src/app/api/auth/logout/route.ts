import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true })

  // מחיקת כל ה-cookies של session
  response.cookies.delete('city_session')
  response.cookies.delete('super_admin_session')

  // מחיקת cookies של Supabase Auth
  response.cookies.delete('sb-access-token')
  response.cookies.delete('sb-refresh-token')

  return response
}
