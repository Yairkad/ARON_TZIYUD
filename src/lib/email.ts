// Email sending utilities for city manager authentication
// Using a simple approach - you can replace with SendGrid, Resend, etc.

export interface EmailOptions {
  to: string
  subject: string
  html: string
}

/**
 * Send email verification link to city manager
 */
export async function sendVerificationEmail(email: string, token: string, managerName: string) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 32px; font-weight: bold; color: #6366f1; }
        .button { display: inline-block; background: linear-gradient(to left, #6366f1, #a855f7); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🏙️ ארון ציוד ידידים</div>
        </div>

        <h2>שלום ${managerName},</h2>

        <p>נוצר עבורך חשבון מנהל במערכת ארון הציוד.</p>

        <p>כדי להפעיל את החשבון ולאמת את כתובת המייל שלך, לחץ על הכפתור הבא:</p>

        <div style="text-align: center;">
          <a href="${verificationUrl}" class="button">✅ אימות כתובת מייל</a>
        </div>

        <p>או העתק את הקישור הבא לדפדפן:</p>
        <p style="background: #f0f0f0; padding: 10px; border-radius: 5px; word-break: break-all;">
          ${verificationUrl}
        </p>

        <p><strong>לתשומת ליבך:</strong> הקישור תקף ל-24 שעות בלבד.</p>

        <p>לאחר אימות המייל, תוכל להגדיר סיסמה חדשה ולהתחבר למערכת.</p>

        <div class="footer">
          <p>אם לא ביקשת את המייל הזה, אנא התעלם ממנו.</p>
          <p>מערכת ארון ציוד ידידים - ${new Date().getFullYear()}</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: '🔐 אימות כתובת מייל - ארון ציוד ידידים',
    html
  })
}

/**
 * Send password reset link to city manager
 */
export async function sendPasswordResetEmail(email: string, token: string, managerName: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 32px; font-weight: bold; color: #6366f1; }
        .button { display: inline-block; background: linear-gradient(to left, #6366f1, #a855f7); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🏙️ ארון ציוד ידידים</div>
        </div>

        <h2>שלום ${managerName},</h2>

        <p>קיבלנו בקשה לאיפוס סיסמת החשבון שלך במערכת ארון הציוד.</p>

        <p>כדי להגדיר סיסמה חדשה, לחץ על הכפתור הבא:</p>

        <div style="text-align: center;">
          <a href="${resetUrl}" class="button">🔑 איפוס סיסמה</a>
        </div>

        <p>או העתק את הקישור הבא לדפדפן:</p>
        <p style="background: #f0f0f0; padding: 10px; border-radius: 5px; word-break: break-all;">
          ${resetUrl}
        </p>

        <p><strong>לתשומת ליבך:</strong> הקישור תקף לשעה אחת בלבד.</p>

        <div class="footer">
          <p>אם לא ביקשת איפוס סיסמה, אנא התעלם ממייל זה והסיסמה שלך תישאר ללא שינוי.</p>
          <p>מערכת ארון ציוד ידידים - ${new Date().getFullYear()}</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: '🔑 איפוס סיסמה - ארון ציוד ידידים',
    html
  })
}

/**
 * Send welcome email with temporary password to new manager
 */
export async function sendWelcomeEmail(email: string, tempPassword: string, managerName: string, cityName: string) {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 32px; font-weight: bold; color: #6366f1; }
        .credentials { background: #f8f9fa; border-right: 4px solid #6366f1; padding: 20px; margin: 20px 0; }
        .button { display: inline-block; background: linear-gradient(to left, #6366f1, #a855f7); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🏙️ ארון ציוד ידידים</div>
        </div>

        <h2>ברוך הבא ${managerName}! 🎉</h2>

        <p>נוצר עבורך חשבון מנהל עבור עיר <strong>${cityName}</strong> במערכת ארון הציוד.</p>

        <div class="credentials">
          <h3>פרטי ההתחברות שלך:</h3>
          <p><strong>📧 כתובת מייל:</strong> ${email}</p>
          <p><strong>🔑 סיסמה זמנית:</strong> <code style="background: white; padding: 5px 10px; border-radius: 4px; font-size: 16px;">${tempPassword}</code></p>
        </div>

        <p><strong style="color: #dc2626;">⚠️ חשוב:</strong> מומלץ בחום להחליף את הסיסמה הזמנית לסיסמה אישית שלך מיד לאחר הכניסה הראשונה!</p>

        <div style="text-align: center;">
          <a href="${loginUrl}" class="button">🚀 התחבר למערכת</a>
        </div>

        <h3>מה אפשר לעשות במערכת?</h3>
        <ul>
          <li>📦 ניהול מלאי ציוד</li>
          <li>✅ אישור בקשות השאלה</li>
          <li>📊 צפייה בהיסטוריה ודוחות</li>
          <li>⚙️ הגדרות ופרטים אישיים</li>
        </ul>

        <div class="footer">
          <p>זקוק לעזרה? צור קשר עם מנהל המערכת</p>
          <p>מערכת ארון ציוד ידידים - ${new Date().getFullYear()}</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: `🎉 ברוך הבא למערכת ארון הציוד - ${cityName}`,
    html
  })
}

/**
 * Send email update notification to new email address
 */
export async function sendEmailUpdateNotification(newEmail: string, userName: string) {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 32px; font-weight: bold; color: #6366f1; }
        .info-box { background: #f0fdf4; border-right: 4px solid #22c55e; padding: 20px; margin: 20px 0; }
        .button { display: inline-block; background: linear-gradient(to left, #6366f1, #a855f7); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🏙️ ארון ציוד ידידים</div>
        </div>

        <h2>שלום ${userName},</h2>

        <p>כתובת המייל שלך במערכת ארון הציוד עודכנה בהצלחה.</p>

        <div class="info-box">
          <p><strong>📧 כתובת המייל החדשה שלך:</strong></p>
          <p style="font-size: 18px; margin: 10px 0;">${newEmail}</p>
        </div>

        <p>מעכשיו תוכל להתחבר למערכת עם כתובת המייל החדשה.</p>

        <div style="text-align: center;">
          <a href="${loginUrl}" class="button">🚀 התחבר למערכת</a>
        </div>

        <p style="color: #dc2626; font-size: 14px;">
          <strong>⚠️ אם לא ביקשת לשנות את כתובת המייל שלך, אנא צור קשר עם מנהל המערכת מיד.</strong>
        </p>

        <div class="footer">
          <p>מערכת ארון ציוד ידידים - ${new Date().getFullYear()}</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: newEmail,
    subject: '✅ כתובת המייל שלך עודכנה - ארון ציוד ידידים',
    html
  })
}

/**
 * Generic email sending function using Resend
 */
async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    // Development mode - log to console
    if (process.env.NODE_ENV === 'development' && !process.env.RESEND_API_KEY) {
      console.log('\n📧 ====== EMAIL (Development Mode) ======')
      console.log('To:', options.to)
      console.log('Subject:', options.subject)
      console.log('HTML:', options.html.substring(0, 200) + '...')
      console.log('==========================================\n')
      return { success: true }
    }

    // Production mode - use Resend
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not configured')
      return { success: false, error: 'Email service not configured' }
    }

    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: options.to,
      subject: options.subject,
      html: options.html,
    })

    if (result.error) {
      console.error('Resend error:', result.error)
      return { success: false, error: result.error.message }
    }

    console.log('✅ Email sent successfully:', result.data?.id)
    return { success: true }

  } catch (error) {
    console.error('Email sending error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
