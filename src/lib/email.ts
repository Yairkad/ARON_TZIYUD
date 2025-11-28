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
 * Send welcome email with password reset link to new manager
 */
export async function sendWelcomeEmail(email: string, resetToken: string, managerName: string, cityName: string) {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim()
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`

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
        </div>

        <p style="text-align: right; direction: rtl;">כדי להתחיל להשתמש במערכת, יש להגדיר סיסמה לחשבון שלך:</p>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(to left, #6366f1, #a855f7); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">🔑 הגדרת סיסמה וכניסה למערכת</a>
        </div>

        <p style="text-align: right; direction: rtl;">או העתק את הקישור הבא לדפדפן:</p>
        <p style="background: #f0f0f0; padding: 10px; border-radius: 5px; word-break: break-all; direction: ltr; text-align: left;">
          ${resetUrl}
        </p>

        <p style="text-align: right; direction: rtl;"><strong>לתשומת ליבך:</strong> הקישור תקף לשעה אחת בלבד.</p>

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
 * Send reminder email for consumables/low stock items that need refilling
 * @param isFollowUp - true if this is a follow-up reminder (sent after 1 week)
 */
export async function sendStockRefillReminder(
  managerEmail: string,
  managerName: string,
  cityName: string,
  items: { name: string; quantity: number; minQuantity: number }[],
  isFollowUp: boolean = false
) {
  const itemsList = items.map(item =>
    `<tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 10px; text-align: right;">${item.name}</td>
      <td style="padding: 10px; text-align: center; color: #dc2626; font-weight: bold;">${item.quantity}</td>
      <td style="padding: 10px; text-align: center;">${item.minQuantity}</td>
    </tr>`
  ).join('')
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim()
  const adminUrl = `${baseUrl}/login`

  const urgencyBadge = isFollowUp
    ? `<span style="background: #dc2626; color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px;">⏰ תזכורת שנייה</span>`
    : `<span style="background: #f59e0b; color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px;">📋 תזכורת ראשונה</span>`

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

        <div style="text-align: center; margin-bottom: 20px;">
          ${urgencyBadge}
        </div>

        <div style="background: ${isFollowUp ? '#fee2e2' : '#fef3c7'}; border-right: 4px solid ${isFollowUp ? '#dc2626' : '#f59e0b'}; padding: 20px; margin: 20px 0; border-radius: 8px; direction: rtl; text-align: right;">
          <h2 style="margin-top: 0; color: ${isFollowUp ? '#991b1b' : '#92400e'};">📦 נדרש מילוי מלאי - ${cityName}</h2>
          <p style="margin-bottom: 0;">${isFollowUp ? 'עבר שבוע מאז התזכורת הקודמת. הפריטים הבאים עדיין דורשים מילוי:' : 'הפריטים הבאים הגיעו לרמת מלאי נמוכה ודורשים מילוי:'}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 10px; text-align: right;">פריט</th>
              <th style="padding: 10px; text-align: center;">כמות נוכחית</th>
              <th style="padding: 10px; text-align: center;">מינימום</th>
            </tr>
          </thead>
          <tbody>
            ${itemsList}
          </tbody>
        </table>

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
    subject: `${isFollowUp ? '⏰ תזכורת שנייה' : '📦 תזכורת'}: מילוי מלאי נדרש - ${cityName}`,
    html
  })
}

/**
 * Send reminder email for faulty equipment that needs repair
 * @param isFollowUp - true if this is a follow-up reminder (sent after 1 week)
 */
export async function sendFaultyEquipmentReminder(
  managerEmail: string,
  managerName: string,
  cityName: string,
  items: { name: string; faultyDays: number; notes?: string }[],
  isFollowUp: boolean = false
) {
  const itemsList = items.map(item =>
    `<tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 10px; text-align: right;">${item.name}</td>
      <td style="padding: 10px; text-align: center; color: #dc2626; font-weight: bold;">${item.faultyDays} ימים</td>
      <td style="padding: 10px; text-align: right; font-size: 12px; color: #666;">${item.notes || '-'}</td>
    </tr>`
  ).join('')
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim()
  const adminUrl = `${baseUrl}/login`

  const urgencyBadge = isFollowUp
    ? `<span style="background: #dc2626; color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px;">⏰ תזכורת שנייה</span>`
    : `<span style="background: #f97316; color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px;">🔧 תזכורת ראשונה</span>`

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

        <div style="text-align: center; margin-bottom: 20px;">
          ${urgencyBadge}
        </div>

        <div style="background: ${isFollowUp ? '#fee2e2' : '#ffedd5'}; border-right: 4px solid ${isFollowUp ? '#dc2626' : '#f97316'}; padding: 20px; margin: 20px 0; border-radius: 8px; direction: rtl; text-align: right;">
          <h2 style="margin-top: 0; color: ${isFollowUp ? '#991b1b' : '#9a3412'};">🔧 ציוד תקול דורש תיקון - ${cityName}</h2>
          <p style="margin-bottom: 0;">${isFollowUp ? 'עבר שבוע מאז התזכורת הקודמת. הציוד הבא עדיין מוגדר כתקול:' : 'הציוד הבא מוגדר כתקול למעלה מ-3 שבועות ודורש טיפול:'}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 10px; text-align: right;">פריט</th>
              <th style="padding: 10px; text-align: center;">זמן כתקול</th>
              <th style="padding: 10px; text-align: right;">הערות</th>
            </tr>
          </thead>
          <tbody>
            ${itemsList}
          </tbody>
        </table>

        <p style="text-align: right; direction: rtl;">מומלץ לשלוח את הציוד לתיקון או להחליף אותו.</p>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${adminUrl}" style="display: inline-block; background: linear-gradient(to left, #6366f1, #a855f7); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">🔧 כניסה לניהול הציוד</a>
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
    subject: `${isFollowUp ? '⏰ תזכורת שנייה' : '🔧 תזכורת'}: ציוד תקול דורש תיקון - ${cityName}`,
    html
  })
}

/**
 * Monthly statistics report email
 */
export interface MonthlyReportData {
  cityName: string
  periodStart: string
  periodEnd: string
  totalBorrows: number
  totalReturns: number
  pendingReturns: number
  topBorrowedItems: { name: string; count: number }[]
  lowStockItems: { name: string; quantity: number }[]
  faultyItems: { name: string; days: number }[]
  activeRequestsCount: number
  approvedRequestsCount: number
  rejectedRequestsCount: number
}

export async function sendMonthlyReportEmail(
  managerEmail: string,
  managerName: string,
  data: MonthlyReportData
) {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim()
  const adminUrl = `${baseUrl}/login`

  const topItemsList = data.topBorrowedItems.length > 0
    ? data.topBorrowedItems.map((item, i) =>
      `<tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 8px; text-align: center;">${i + 1}</td>
        <td style="padding: 8px; text-align: right;">${item.name}</td>
        <td style="padding: 8px; text-align: center; font-weight: bold;">${item.count}</td>
      </tr>`
    ).join('')
    : '<tr><td colspan="3" style="padding: 15px; text-align: center; color: #666;">אין נתונים</td></tr>'

  const lowStockSection = data.lowStockItems.length > 0
    ? `<div style="background: #fef3c7; border-right: 4px solid #f59e0b; padding: 15px; margin: 10px 0; border-radius: 8px;">
        <h4 style="margin-top: 0; color: #92400e;">⚠️ פריטים במלאי נמוך (${data.lowStockItems.length})</h4>
        <ul style="margin: 0; padding-right: 20px;">
          ${data.lowStockItems.map(item => `<li>${item.name} - ${item.quantity} יחידות</li>`).join('')}
        </ul>
      </div>`
    : ''

  const faultySection = data.faultyItems.length > 0
    ? `<div style="background: #fee2e2; border-right: 4px solid #ef4444; padding: 15px; margin: 10px 0; border-radius: 8px;">
        <h4 style="margin-top: 0; color: #991b1b;">🔧 ציוד תקול (${data.faultyItems.length})</h4>
        <ul style="margin: 0; padding-right: 20px;">
          ${data.faultyItems.map(item => `<li>${item.name} - ${item.days} ימים</li>`).join('')}
        </ul>
      </div>`
    : ''

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

        <div style="background: linear-gradient(135deg, #6366f1, #a855f7); color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px; text-align: center;">
          <h1 style="margin: 0 0 10px 0; font-size: 24px;">📊 דוח חודשי - ${data.cityName}</h1>
          <p style="margin: 0; opacity: 0.9;">${data.periodStart} - ${data.periodEnd}</p>
        </div>

        <h2 style="text-align: right; direction: rtl;">שלום ${managerName},</h2>
        <p style="text-align: right; direction: rtl;">להלן סיכום הפעילות החודשית בארון הציוד:</p>

        <!-- Summary Cards -->
        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0;">
          <div style="flex: 1; min-width: 120px; background: #f0fdf4; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 28px; font-weight: bold; color: #16a34a;">${data.totalBorrows}</div>
            <div style="color: #166534; font-size: 14px;">השאלות</div>
          </div>
          <div style="flex: 1; min-width: 120px; background: #eff6ff; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 28px; font-weight: bold; color: #2563eb;">${data.totalReturns}</div>
            <div style="color: #1e40af; font-size: 14px;">החזרות</div>
          </div>
          <div style="flex: 1; min-width: 120px; background: #fef3c7; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 28px; font-weight: bold; color: #d97706;">${data.pendingReturns}</div>
            <div style="color: #92400e; font-size: 14px;">ממתינים להחזרה</div>
          </div>
        </div>

        <!-- Request Stats -->
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">📝 סטטיסטיקת בקשות</h3>
          <div style="display: flex; justify-content: space-around; text-align: center;">
            <div>
              <div style="font-size: 20px; font-weight: bold; color: #16a34a;">${data.approvedRequestsCount}</div>
              <div style="font-size: 12px; color: #666;">אושרו</div>
            </div>
            <div>
              <div style="font-size: 20px; font-weight: bold; color: #dc2626;">${data.rejectedRequestsCount}</div>
              <div style="font-size: 12px; color: #666;">נדחו</div>
            </div>
            <div>
              <div style="font-size: 20px; font-weight: bold; color: #f59e0b;">${data.activeRequestsCount}</div>
              <div style="font-size: 12px; color: #666;">ממתינות</div>
            </div>
          </div>
        </div>

        <!-- Top Borrowed Items -->
        <h3 style="text-align: right; direction: rtl;">🏆 פריטים מושאלים ביותר</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 8px; text-align: center; width: 40px;">#</th>
              <th style="padding: 8px; text-align: right;">פריט</th>
              <th style="padding: 8px; text-align: center;">השאלות</th>
            </tr>
          </thead>
          <tbody>
            ${topItemsList}
          </tbody>
        </table>

        <!-- Alerts Section -->
        ${lowStockSection}
        ${faultySection}

        <div style="text-align: center; margin: 25px 0;">
          <a href="${adminUrl}" style="display: inline-block; background: linear-gradient(to left, #6366f1, #a855f7); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">📊 צפייה בדוחות מלאים</a>
        </div>

        <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
          <p>דוח זה נשלח אוטומטית בתחילת כל חודש</p>
          <p>מערכת ארון ציוד ידידים - ${new Date().getFullYear()}</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: managerEmail,
    subject: `📊 דוח חודשי - ${data.cityName} (${data.periodStart} - ${data.periodEnd})`,
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
