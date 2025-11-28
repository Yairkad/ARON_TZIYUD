// Email sending utilities for city manager authentication
// Using Gmail SMTP via Nodemailer

import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

export interface EmailOptions {
  to: string
  subject: string
  html: string
}

export interface EmailLogOptions {
  recipientEmail: string
  recipientName?: string
  emailType: 'password_reset' | 'welcome' | 'email_update' | 'verification' | 'other'
  subject: string
  status: 'sent' | 'failed' | 'pending'
  errorMessage?: string
  sentBy?: string
  metadata?: Record<string, any>
}

/**
 * Log email to database for tracking
 */
export async function logEmail(options: EmailLogOptions): Promise<void> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Cannot log email - missing Supabase config')
      return
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { error } = await supabase
      .from('email_logs')
      .insert({
        recipient_email: options.recipientEmail,
        recipient_name: options.recipientName || null,
        email_type: options.emailType,
        subject: options.subject,
        status: options.status,
        error_message: options.errorMessage || null,
        sent_by: options.sentBy || null,
        metadata: options.metadata || {}
      })

    if (error) {
      console.error('❌ Error logging email:', error)
    } else {
      console.log('📝 Email logged:', options.emailType, 'to', options.recipientEmail)
    }
  } catch (error) {
    console.error('❌ Error in logEmail:', error)
  }
}

/**
 * Send email verification link to city manager
 */
export async function sendVerificationEmail(email: string, token: string, managerName: string) {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim()
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; margin: 0; direction: rtl; text-align: right;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); direction: rtl; text-align: right;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="font-size: 32px; font-weight: bold; color: #6366f1;">🏙️ ארון ציוד ידידים</div>
        </div>

        <h2 style="text-align: right; direction: rtl;">שלום ${managerName},</h2>

        <p style="text-align: right; direction: rtl;">נוצר עבורך חשבון מנהל במערכת ארון הציוד.</p>

        <p style="text-align: right; direction: rtl;">כדי להפעיל את החשבון ולאמת את כתובת המייל שלך, לחץ על הכפתור הבא:</p>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(to left, #6366f1, #a855f7); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">✅ אימות כתובת מייל</a>
        </div>

        <p style="text-align: right; direction: rtl;">או העתק את הקישור הבא לדפדפן:</p>
        <p style="background: #f0f0f0; padding: 10px; border-radius: 5px; word-break: break-all; direction: ltr; text-align: left;">
          ${verificationUrl}
        </p>

        <p style="text-align: right; direction: rtl;"><strong>לתשומת ליבך:</strong> הקישור תקף ל-24 שעות בלבד.</p>

        <p style="text-align: right; direction: rtl;">לאחר אימות המייל, תוכל להגדיר סיסמה חדשה ולהתחבר למערכת.</p>

        <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
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
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim()
  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; margin: 0; direction: rtl; text-align: right;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); direction: rtl; text-align: right;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="font-size: 32px; font-weight: bold; color: #6366f1;">🏙️ ארון ציוד ידידים</div>
        </div>

        <h2 style="text-align: right; direction: rtl;">שלום ${managerName},</h2>

        <p style="text-align: right; direction: rtl;">קיבלנו בקשה לאיפוס סיסמת החשבון שלך במערכת ארון הציוד.</p>

        <p style="text-align: right; direction: rtl;">כדי להגדיר סיסמה חדשה, לחץ על הכפתור הבא:</p>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(to left, #6366f1, #a855f7); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">🔑 איפוס סיסמה</a>
        </div>

        <p style="text-align: right; direction: rtl;">או העתק את הקישור הבא לדפדפן:</p>
        <p style="background: #f0f0f0; padding: 10px; border-radius: 5px; word-break: break-all; direction: ltr; text-align: left;">
          ${resetUrl}
        </p>

        <p style="text-align: right; direction: rtl;"><strong>לתשומת ליבך:</strong> הקישור תקף לשעה אחת בלבד.</p>

        <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
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
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim()
  const loginUrl = `${baseUrl}/login`

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; margin: 0; direction: rtl; text-align: right;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); direction: rtl; text-align: right;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="font-size: 32px; font-weight: bold; color: #6366f1;">🏙️ ארון ציוד ידידים</div>
        </div>

        <h2 style="text-align: right; direction: rtl;">ברוך הבא ${managerName}! 🎉</h2>

        <p style="text-align: right; direction: rtl;">נוצר עבורך חשבון מנהל עבור עיר <strong>${cityName}</strong> במערכת ארון הציוד.</p>

        <div style="background: #f8f9fa; border-right: 4px solid #6366f1; padding: 20px; margin: 20px 0; direction: rtl; text-align: right;">
          <h3 style="margin-top: 0;">פרטי ההתחברות שלך:</h3>
          <p><strong>📧 כתובת מייל:</strong> ${email}</p>
          <p><strong>🔑 סיסמה זמנית:</strong> <code style="background: white; padding: 5px 10px; border-radius: 4px; font-size: 16px;">${tempPassword}</code></p>
        </div>

        <p style="text-align: right; direction: rtl;"><strong style="color: #dc2626;">⚠️ חשוב:</strong> מומלץ בחום להחליף את הסיסמה הזמנית לסיסמה אישית שלך מיד לאחר הכניסה הראשונה!</p>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(to left, #6366f1, #a855f7); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">🚀 התחבר למערכת</a>
        </div>

        <h3 style="text-align: right; direction: rtl;">מה אפשר לעשות במערכת?</h3>
        <ul style="text-align: right; direction: rtl; padding-right: 20px;">
          <li>📦 ניהול מלאי ציוד</li>
          <li>✅ אישור בקשות השאלה</li>
          <li>📊 צפייה בהיסטוריה ודוחות</li>
          <li>⚙️ הגדרות ופרטים אישיים</li>
        </ul>

        <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
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
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim()
  const loginUrl = `${baseUrl}/login`

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; margin: 0; direction: rtl; text-align: right;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); direction: rtl; text-align: right;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="font-size: 32px; font-weight: bold; color: #6366f1;">🏙️ ארון ציוד ידידים</div>
        </div>

        <h2 style="text-align: right; direction: rtl;">שלום ${userName},</h2>

        <p style="text-align: right; direction: rtl;">כתובת המייל שלך במערכת ארון הציוד עודכנה בהצלחה.</p>

        <div style="background: #f0fdf4; border-right: 4px solid #22c55e; padding: 20px; margin: 20px 0; direction: rtl; text-align: right;">
          <p style="margin: 0;"><strong>📧 כתובת המייל החדשה שלך:</strong></p>
          <p style="font-size: 18px; margin: 10px 0;">${newEmail}</p>
        </div>

        <p style="text-align: right; direction: rtl;">מעכשיו תוכל להתחבר למערכת עם כתובת המייל החדשה.</p>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(to left, #6366f1, #a855f7); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">🚀 התחבר למערכת</a>
        </div>

        <p style="color: #dc2626; font-size: 14px; text-align: right; direction: rtl;">
          <strong>⚠️ אם לא ביקשת לשנות את כתובת המייל שלך, אנא צור קשר עם מנהל המערכת מיד.</strong>
        </p>

        <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
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
 * Send notification email about new equipment request
 */
export async function sendNewRequestEmail(
  managerEmail: string,
  managerName: string,
  requesterName: string,
  requesterPhone: string,
  cityName: string,
  items: { name: string; quantity: number }[]
) {
  const itemsList = items.map(item => `<li style="padding: 5px 0;">${item.name} (כמות: ${item.quantity})</li>`).join('')
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim()
  const adminUrl = `${baseUrl}/login`

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; margin: 0; direction: rtl; text-align: right;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); direction: rtl; text-align: right;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="font-size: 32px; font-weight: bold; color: #6366f1;">🏙️ ארון ציוד ידידים</div>
        </div>

        <div style="background: #fef3c7; border-right: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px; direction: rtl; text-align: right;">
          <h2 style="margin-top: 0; color: #92400e;">📦 בקשת ציוד חדשה!</h2>
          <p style="margin-bottom: 0;">התקבלה בקשה חדשה לציוד מארון ${cityName}</p>
        </div>

        <h3 style="text-align: right; direction: rtl;">פרטי המבקש:</h3>
        <p style="text-align: right; direction: rtl;"><strong>👤 שם:</strong> ${requesterName}</p>
        <p style="text-align: right; direction: rtl;"><strong>📱 טלפון:</strong> <a href="tel:${requesterPhone}" style="color: #6366f1;">${requesterPhone}</a></p>

        <h3 style="text-align: right; direction: rtl;">פריטים מבוקשים:</h3>
        <ul style="background: #f8f9fa; padding: 15px 35px 15px 15px; border-radius: 8px; direction: rtl; text-align: right; list-style-position: inside;">
          ${itemsList}
        </ul>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${adminUrl}" style="display: inline-block; background: linear-gradient(to left, #6366f1, #a855f7); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">📋 כניסה לניהול הבקשות</a>
        </div>

        <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
          <p>מערכת ארון ציוד ידידים - ${new Date().getFullYear()}</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: managerEmail,
    subject: `📦 בקשת ציוד חדשה - ${requesterName}`,
    html
  })
}

/**
 * Send notification email about low stock
 */
export async function sendLowStockEmail(
  managerEmail: string,
  managerName: string,
  cityName: string,
  items: { name: string; quantity: number; minQuantity: number }[]
) {
  const itemsList = items.map(item =>
    `<li style="padding: 5px 0;"><strong>${item.name}</strong> - נשארו ${item.quantity} (מינימום: ${item.minQuantity})</li>`
  ).join('')
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim()
  const adminUrl = `${baseUrl}/login`

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; margin: 0; direction: rtl; text-align: right;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); direction: rtl; text-align: right;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="font-size: 32px; font-weight: bold; color: #6366f1;">🏙️ ארון ציוד ידידים</div>
        </div>

        <div style="background: #fee2e2; border-right: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 8px; direction: rtl; text-align: right;">
          <h2 style="margin-top: 0; color: #991b1b;">⚠️ התראת מלאי נמוך!</h2>
          <p style="margin-bottom: 0;">יש פריטים במלאי נמוך בארון ${cityName}</p>
        </div>

        <h3 style="text-align: right; direction: rtl;">פריטים שנגמרים:</h3>
        <ul style="background: #fef2f2; padding: 15px 35px 15px 15px; border-radius: 8px; color: #991b1b; direction: rtl; text-align: right; list-style-position: inside;">
          ${itemsList}
        </ul>

        <p style="text-align: right; direction: rtl;">מומלץ להזמין מלאי חדש בהקדם.</p>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${adminUrl}" style="display: inline-block; background: linear-gradient(to left, #6366f1, #a855f7); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">📦 כניסה לניהול המלאי</a>
        </div>

        <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
          <p>מערכת ארון ציוד ידידים - ${new Date().getFullYear()}</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: managerEmail,
    subject: `⚠️ התראת מלאי נמוך - ${cityName}`,
    html
  })
}

/**
 * Send custom email (for super admin direct sending)
 */
export async function sendCustomEmail(
  to: string,
  subject: string,
  message: string,
  recipientName?: string
) {
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; margin: 0; direction: rtl; text-align: right;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); direction: rtl; text-align: right;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="font-size: 32px; font-weight: bold; color: #6366f1;">🏙️ ארון ציוד ידידים</div>
        </div>

        ${recipientName ? `<h2 style="text-align: right; direction: rtl;">שלום ${recipientName},</h2>` : ''}

        <div style="text-align: right; direction: rtl; white-space: pre-wrap; line-height: 1.8;">
${message}
        </div>

        <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
          <p>מערכת ארון ציוד ידידים - ${new Date().getFullYear()}</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to,
    subject,
    html
  })
}

/**
 * Generic email sending function using Gmail SMTP
 */
async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    // Development mode - log to console
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_PASSWORD) {
      console.log('\n📧 ====== EMAIL (Development Mode) ======')
      console.log('To:', options.to)
      console.log('Subject:', options.subject)
      console.log('HTML:', options.html.substring(0, 200) + '...')
      console.log('==========================================\n')
      return { success: true }
    }

    // Check SMTP configuration
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.error('❌ SMTP not configured. Need: SMTP_HOST, SMTP_USER, SMTP_PASSWORD')
      return { success: false, error: 'Email service not configured' }
    }

    // Create transporter for Gmail SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })

    // Send email
    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: options.to,
      subject: options.subject,
      html: options.html,
    })

    console.log('✅ Email sent successfully:', result.messageId)
    return { success: true }

  } catch (error) {
    console.error('Email sending error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
