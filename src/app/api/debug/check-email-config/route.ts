/**
 * API Route: Check Email Configuration
 * GET /api/debug/check-email-config
 *
 * Checks if email environment variables are properly configured
 */

import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const config = {
      hasResendApiKey: !!process.env.RESEND_API_KEY,
      resendApiKeyLength: process.env.RESEND_API_KEY?.length || 0,
      resendApiKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 8) || 'missing',
      hasEmailFrom: !!process.env.EMAIL_FROM,
      emailFrom: process.env.EMAIL_FROM || 'missing',
      hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'missing',
      nodeEnv: process.env.NODE_ENV,
    }

    console.log('📧 Email Configuration Check:', config)

    return NextResponse.json({
      success: true,
      config,
      message: config.hasResendApiKey
        ? 'Email configuration looks good'
        : 'RESEND_API_KEY is missing!',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Error checking email config:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error checking email configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
