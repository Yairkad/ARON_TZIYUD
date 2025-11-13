/**
 * API Route: Test Email
 * POST /api/email/test
 *
 * Sends a test email to verify email configuration
 */

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

// Helper function to add CORS headers to response
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  return response
}

export async function POST(request: NextRequest) {
  try {
    const { email, name, message } = await request.json()

    if (!email) {
      const response = NextResponse.json(
        { error: 'חסרה כתובת מייל' },
        { status: 400 }
      )
      return addCorsHeaders(response)
    }

    const recipientName = name || 'משתמש'
    const customMessage = message || 'זהו מייל בדיקה אוטומטי ממערכת ארון ציוד.'

    console.log('📧 Sending test email to:', email)

    // Send test email using Resend
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: [email],
      subject: 'בדיקת מערכת מיילים - ארון ציוד',
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              direction: rtl;
              background-color: #f5f5f5;
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: white;
              border-radius: 12px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .content {
              padding: 30px;
            }
            .success-icon {
              text-align: center;
              font-size: 64px;
              margin: 20px 0;
            }
            .info-box {
              background-color: #d1fae5;
              border: 2px solid #10b981;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
              text-align: center;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 20px;
              text-align: center;
              color: #6c757d;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✉️ מייל בדיקה</h1>
              <p style="margin: 10px 0 0 0;">מערכת ארון ציוד</p>
            </div>

            <div class="content">
              <div class="success-icon">✅</div>

              <h2 style="text-align: center; color: #10b981;">הצלחה!</h2>

              <p style="text-align: center; font-size: 18px;">
                שלום ${recipientName},
              </p>

              <div class="info-box">
                <strong>מערכת המיילים פועלת כראוי!</strong><br><br>
                ${customMessage}
              </div>

              <p style="text-align: center; color: #6c757d; margin-top: 30px;">
                <strong>פרטי בדיקה:</strong><br>
                זמן שליחה: ${new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}<br>
                כתובת מייל: ${email}
              </p>
            </div>

            <div class="footer">
              <p>מייל בדיקה זה נשלח אוטומטית ממערכת ארון ציוד</p>
              <p style="margin: 5px 0;">© ${new Date().getFullYear()} כל הזכויות שמורות</p>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error('❌ Resend error:', error)
      const response = NextResponse.json(
        {
          success: false,
          error: 'שגיאה בשליחת המייל',
          details: error
        },
        { status: 500 }
      )
      return addCorsHeaders(response)
    }

    console.log('✅ Test email sent successfully:', data)

    const response = NextResponse.json({
      success: true,
      messageId: data?.id,
      message: 'המייל נשלח בהצלחה',
      sentTo: email,
    })
    return addCorsHeaders(response)
  } catch (error) {
    console.error('❌ Test email error:', error)
    const response = NextResponse.json(
      {
        success: false,
        error: 'שגיאה בתהליך שליחת המייל',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
    return addCorsHeaders(response)
  }
}
