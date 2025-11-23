import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage, sendManagerAlertWhatsApp, sendRequestStatusWhatsApp } from '@/lib/whatsapp'

// Initialize Supabase client with service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, phone, ...params } = body

    if (!type || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields: type, phone' },
        { status: 400 }
      )
    }

    let result

    switch (type) {
      case 'text':
        // Simple text message
        if (!params.message) {
          return NextResponse.json(
            { error: 'Missing message for text type' },
            { status: 400 }
          )
        }
        result = await sendWhatsAppMessage(phone, params.message)
        break

      case 'manager_alert':
        // Alert notification for managers
        if (!params.managerName || !params.alertType || !params.details) {
          return NextResponse.json(
            { error: 'Missing required params for manager_alert' },
            { status: 400 }
          )
        }
        result = await sendManagerAlertWhatsApp(
          phone,
          params.managerName,
          params.alertType,
          params.details
        )
        break

      case 'request_status':
        // Request status update
        if (!params.userName || !params.status || !params.equipmentName) {
          return NextResponse.json(
            { error: 'Missing required params for request_status' },
            { status: 400 }
          )
        }
        result = await sendRequestStatusWhatsApp(
          phone,
          params.userName,
          params.status,
          params.equipmentName,
          params.notes
        )
        break

      default:
        return NextResponse.json(
          { error: `Unknown message type: ${type}` },
          { status: 400 }
        )
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId
      })
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('WhatsApp API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
