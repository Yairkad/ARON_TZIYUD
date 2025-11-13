/**
 * API Route: Send Welcome Email
 * POST /api/email/welcome
 *
 * Sends a welcome email to newly created users with their login credentials
 */

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { email, name, password, role } = await request.json()

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'חסרים פרטים נדרשים' },
        { status: 400 }
      )
    }

    // Determine role display name
    const roleDisplay = role === 'super_admin' ? 'מנהל ראשי' : 'מנהל עיר'

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: [email],
      subject: 'ברוכים הבאים למערכת ארון ציוד',
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
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
            .welcome-text {
              font-size: 18px;
              color: #333;
              margin-bottom: 20px;
            }
            .info-box {
              background-color: #f8f9fa;
              border: 2px solid #e9ecef;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 10px 0;
              padding: 8px 0;
              border-bottom: 1px solid #e9ecef;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .info-label {
              font-weight: bold;
              color: #495057;
            }
            .info-value {
              color: #212529;
              font-family: monospace;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-decoration: none;
              padding: 15px 40px;
              border-radius: 8px;
              margin: 20px 0;
              font-weight: bold;
              text-align: center;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 20px;
              text-align: center;
              color: #6c757d;
              font-size: 14px;
            }
            .warning {
              background-color: #fff3cd;
              border: 1px solid #ffc107;
              border-radius: 6px;
              padding: 15px;
              margin: 20px 0;
              color: #856404;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 ברוכים הבאים!</h1>
              <p style="margin: 10px 0 0 0;">מערכת ארון ציוד</p>
            </div>

            <div class="content">
              <p class="welcome-text">
                שלום ${name},
              </p>

              <p>
                נוצר עבורך חשבון חדש במערכת ארון ציוד. להלן פרטי ההתחברות שלך:
              </p>

              <div class="info-box">
                <div class="info-row">
                  <span class="info-label">כתובת אימייל:</span>
                  <span class="info-value">${email}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">סיסמה זמנית:</span>
                  <span class="info-value">${password}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">תפקיד:</span>
                  <span class="info-value">${roleDisplay}</span>
                </div>
              </div>

              <div class="warning">
                <strong>⚠️ חשוב!</strong><br>
                מומלץ לשנות את הסיסמה בכניסה הראשונה למערכת לסיסמה אישית ומאובטחת.
              </div>

              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" class="button">
                  כניסה למערכת
                </a>
              </div>

              <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
                אם יש לך שאלות או בעיות בהתחברות, צור קשר עם מנהל המערכת.
              </p>
            </div>

            <div class="footer">
              <p>מייל זה נשלח אוטומטית ממערכת ארון ציוד</p>
              <p style="margin: 5px 0;">© ${new Date().getFullYear()} כל הזכויות שמורות</p>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error('❌ Resend error:', error)
      return NextResponse.json(
        { error: 'שגיאה בשליחת המייל' },
        { status: 500 }
      )
    }

    console.log('✅ Welcome email sent successfully:', data)

    return NextResponse.json({
      success: true,
      messageId: data?.id,
    })
  } catch (error) {
    console.error('❌ Welcome email error:', error)
    return NextResponse.json(
      { error: 'שגיאה בתהליך שליחת המייל' },
      { status: 500 }
    )
  }
}
