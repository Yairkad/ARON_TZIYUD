import { NextRequest, NextResponse } from 'next/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json()

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Check if WhatsApp is configured
    if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      return NextResponse.json({
        success: false,
        error: 'WhatsApp not configured',
        config: {
          hasAccessToken: !!process.env.WHATSAPP_ACCESS_TOKEN,
          hasPhoneNumberId: !!process.env.WHATSAPP_PHONE_NUMBER_ID
        }
      }, { status: 500 })
    }

    const testMessage = `🧪 הודעת בדיקה ממערכת ארון ציוד ידידים

אם אתה רואה הודעה זו, החיבור ל-WhatsApp עובד בהצלחה! ✅

תאריך: ${new Date().toLocaleString('he-IL')}`

    const result = await sendWhatsAppMessage(phone, testMessage)

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error
    })

  } catch (error) {
    console.error('WhatsApp test error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  // Check configuration status
  return NextResponse.json({
    configured: !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
    hasAccessToken: !!process.env.WHATSAPP_ACCESS_TOKEN,
    hasPhoneNumberId: !!process.env.WHATSAPP_PHONE_NUMBER_ID
  })
}
