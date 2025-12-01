/**
 * Email Service using Gmail SMTP (nodemailer)
 *
 * Required environment variables:
 * - GMAIL_USER: Gmail address to send from
 * - GMAIL_APP_PASSWORD: Gmail app password (not regular password)
 *
 * To get an app password:
 * 1. Enable 2FA on your Google account
 * 2. Go to https://myaccount.google.com/apppasswords
 * 3. Create a new app password for "Mail"
 */

import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client for logging
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

// Email result type
interface EmailResult {
  success: boolean
  error?: string
}

// App URL for links
const getAppUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Common email styles (RTL for Hebrew)
const emailStyles = `
  <style>
    body { font-family: Arial, sans-serif; direction: rtl; text-align: right; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
    .button:hover { background: #1d4ed8; }
    .alert { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 10px 0; }
    .alert-danger { background: #fee2e2; border-color: #ef4444; }
    .list { list-style: none; padding: 0; }
    .list li { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .list li:last-child { border-bottom: none; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 10px; border: 1px solid #e5e7eb; text-align: right; }
    th { background: #f3f4f6; }
  </style>
`

/**
 * Send email using Gmail SMTP
 */
async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<EmailResult> {
  try {
    // Check if Gmail credentials are configured
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('Gmail credentials not configured')
      return { success: false, error: 'Gmail credentials not configured' }
    }

    const transporter = createTransporter()

    await transporter.sendMail({
      from: `"ארון ציוד ידידים" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${emailStyles}
        </head>
        <body>
          ${html}
        </body>
        </html>
      `,
    })

    return { success: true }
  } catch (error) {
    console.error('Error sending email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Log email to database
 */
export interface LogEmailParams {
  recipientEmail: string
  recipientName?: string | null
  emailType: 'welcome' | 'password_reset' | 'verification' | 'email_update' | 'other'
  subject: string
  status: 'sent' | 'failed'
  errorMessage?: string
  sentBy?: string
  metadata?: Record<string, any>
}

export async function logEmail(params: LogEmailParams): Promise<void> {
  try {
    await supabase.from('email_logs').insert({
      recipient_email: params.recipientEmail,
      recipient_name: params.recipientName,
      email_type: params.emailType,
      subject: params.subject,
      status: params.status,
      error_message: params.errorMessage,
      sent_by: params.sentBy,
      metadata: params.metadata,
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error logging email:', error)
  }
}

/**
 * Send new equipment request notification to city manager
 */
export async function sendNewRequestEmail(
  managerEmail: string,
  managerName: string,
  requesterName: string,
  requesterPhone: string,
  cityName: string,
  items: { name: string; quantity: number }[]
): Promise<EmailResult> {
  const itemsList = items
    .map(item => `<li>${item.name} (כמות: ${item.quantity})</li>`)
    .join('')

  const html = `
    <div class="container">
      <div class="header">
        <h1>🔔 בקשה חדשה לציוד</h1>
      </div>
      <div class="content">
        <p>שלום ${managerName},</p>
        <p>התקבלה בקשה חדשה לציוד בארון ${cityName}:</p>

        <div class="alert">
          <strong>פרטי המבקש:</strong><br>
          שם: ${requesterName}<br>
          טלפון: <a href="tel:${requesterPhone}">${requesterPhone}</a>
        </div>

        <p><strong>פריטים מבוקשים:</strong></p>
        <ul class="list">${itemsList}</ul>

        <p>
          <a href="${getAppUrl()}" class="button">כניסה למערכת</a>
        </p>
      </div>
      <div class="footer">
        <p>מערכת ארון ציוד ידידים</p>
      </div>
    </div>
  `

  return sendEmail(
    managerEmail,
    `🔔 בקשה חדשה לציוד - ${cityName}`,
    html
  )
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  recipientName: string
): Promise<EmailResult> {
  const resetLink = `${getAppUrl()}/reset-password?token=${resetToken}`

  const html = `
    <div class="container">
      <div class="header">
        <h1>🔑 איפוס סיסמה</h1>
      </div>
      <div class="content">
        <p>שלום ${recipientName},</p>
        <p>קיבלנו בקשה לאיפוס הסיסמה שלך במערכת ארון ציוד ידידים.</p>
        <p>לחץ על הכפתור הבא כדי לאפס את הסיסמה:</p>

        <p style="text-align: center;">
          <a href="${resetLink}" class="button">איפוס סיסמה</a>
        </p>

        <div class="alert">
          <strong>שים לב:</strong> הקישור תקף לשעה אחת בלבד.
        </div>

        <p>אם לא ביקשת לאפס את הסיסמה, התעלם מהודעה זו.</p>
      </div>
      <div class="footer">
        <p>מערכת ארון ציוד ידידים</p>
      </div>
    </div>
  `

  return sendEmail(
    email,
    '🔑 איפוס סיסמה - ארון ציוד ידידים',
    html
  )
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(
  email: string,
  resetToken: string,
  recipientName: string,
  cityName: string
): Promise<EmailResult> {
  const resetLink = `${getAppUrl()}/reset-password?token=${resetToken}`

  const html = `
    <div class="container">
      <div class="header">
        <h1>🎉 ברוך הבא!</h1>
      </div>
      <div class="content">
        <p>שלום ${recipientName},</p>
        <p>ברוך הבא למערכת ארון ציוד ידידים - ${cityName}!</p>
        <p>חשבונך נוצר בהצלחה. לחץ על הכפתור הבא כדי להגדיר את הסיסמה שלך:</p>

        <p style="text-align: center;">
          <a href="${resetLink}" class="button">הגדרת סיסמה</a>
        </p>

        <div class="alert">
          <strong>שים לב:</strong> הקישור תקף לשעה אחת בלבד.
        </div>

        <p>לאחר הגדרת הסיסמה, תוכל להתחבר למערכת ולנהל את ארון הציוד.</p>
      </div>
      <div class="footer">
        <p>מערכת ארון ציוד ידידים</p>
      </div>
    </div>
  `

  return sendEmail(
    email,
    `🎉 ברוך הבא למערכת ארון הציוד - ${cityName}`,
    html
  )
}

/**
 * Send email verification email (for email change)
 */
export async function sendVerificationEmail(
  email: string,
  verificationToken: string,
  recipientName: string
): Promise<EmailResult> {
  const verifyLink = `${getAppUrl()}/verify-email?token=${verificationToken}`

  const html = `
    <div class="container">
      <div class="header">
        <h1>✉️ אימות כתובת מייל</h1>
      </div>
      <div class="content">
        <p>שלום ${recipientName},</p>
        <p>כתובת המייל שלך במערכת ארון ציוד ידידים עודכנה.</p>
        <p>לחץ על הכפתור הבא כדי לאמת את כתובת המייל החדשה:</p>

        <p style="text-align: center;">
          <a href="${verifyLink}" class="button">אימות כתובת מייל</a>
        </p>

        <div class="alert">
          <strong>שים לב:</strong> הקישור תקף ל-24 שעות בלבד.
        </div>

        <p>אם לא ביקשת לשנות את כתובת המייל, פנה למנהל המערכת.</p>
      </div>
      <div class="footer">
        <p>מערכת ארון ציוד ידידים</p>
      </div>
    </div>
  `

  return sendEmail(
    email,
    '✉️ אימות כתובת מייל - ארון ציוד ידידים',
    html
  )
}

/**
 * Send custom email
 */
export async function sendCustomEmail(
  to: string,
  subject: string,
  message: string,
  recipientName?: string
): Promise<EmailResult> {
  const html = `
    <div class="container">
      <div class="header">
        <h1>📧 הודעה מארון ציוד ידידים</h1>
      </div>
      <div class="content">
        ${recipientName ? `<p>שלום ${recipientName},</p>` : ''}
        <div style="white-space: pre-wrap;">${message}</div>
      </div>
      <div class="footer">
        <p>מערכת ארון ציוד ידידים</p>
      </div>
    </div>
  `

  return sendEmail(to, subject, html)
}

/**
 * Send low stock alert email (immediate alert after pickup)
 */
export async function sendLowStockEmail(
  managerEmail: string,
  managerName: string,
  cityName: string,
  items: { name: string; quantity: number; minQuantity: number }[]
): Promise<EmailResult> {
  const itemsList = items
    .map(item => `
      <tr>
        <td>${item.name}</td>
        <td>${item.quantity}</td>
        <td>${item.minQuantity}</td>
      </tr>
    `)
    .join('')

  const html = `
    <div class="container">
      <div class="header" style="background: #f59e0b;">
        <h1>📦 התראת מלאי נמוך</h1>
      </div>
      <div class="content">
        <p>שלום ${managerName},</p>
        <p>הפריטים הבאים בארון ${cityName} הגיעו למלאי נמוך:</p>

        <table>
          <thead>
            <tr>
              <th>פריט</th>
              <th>כמות נוכחית</th>
              <th>כמות מינימלית</th>
            </tr>
          </thead>
          <tbody>
            ${itemsList}
          </tbody>
        </table>

        <div class="alert">
          מומלץ להשלים את המלאי בהקדם האפשרי.
        </div>

        <p>
          <a href="${getAppUrl()}" class="button">כניסה למערכת</a>
        </p>
      </div>
      <div class="footer">
        <p>מערכת ארון ציוד ידידים</p>
      </div>
    </div>
  `

  return sendEmail(
    managerEmail,
    `📦 התראת מלאי נמוך - ${cityName}`,
    html
  )
}

/**
 * Send stock refill reminder (daily cron alert)
 */
export async function sendStockRefillReminder(
  managerEmail: string,
  managerName: string,
  cityName: string,
  items: { name: string; quantity: number; minQuantity: number }[],
  isFollowUp: boolean
): Promise<EmailResult> {
  const itemsList = items
    .map(item => `
      <tr>
        <td>${item.name}</td>
        <td>${item.quantity}</td>
        <td>${item.minQuantity}</td>
      </tr>
    `)
    .join('')

  const title = isFollowUp ? '⏰ תזכורת שנייה: מילוי מלאי נדרש' : '📦 תזכורת: מילוי מלאי נדרש'

  const html = `
    <div class="container">
      <div class="header" style="background: ${isFollowUp ? '#ef4444' : '#f59e0b'};">
        <h1>${title}</h1>
      </div>
      <div class="content">
        <p>שלום ${managerName},</p>
        ${isFollowUp
          ? `<p><strong>זוהי תזכורת נוספת!</strong> הפריטים הבאים עדיין במלאי נמוך:</p>`
          : `<p>הפריטים הבאים בארון ${cityName} נמצאים במלאי נמוך:</p>`
        }

        <table>
          <thead>
            <tr>
              <th>פריט</th>
              <th>כמות נוכחית</th>
              <th>כמות מינימלית</th>
            </tr>
          </thead>
          <tbody>
            ${itemsList}
          </tbody>
        </table>

        <div class="alert ${isFollowUp ? 'alert-danger' : ''}">
          ${isFollowUp
            ? 'יש למלא את המלאי בהקדם האפשרי!'
            : 'מומלץ להשלים את המלאי בהקדם.'
          }
        </div>

        <p>
          <a href="${getAppUrl()}" class="button">כניסה למערכת</a>
        </p>
      </div>
      <div class="footer">
        <p>מערכת ארון ציוד ידידים</p>
      </div>
    </div>
  `

  return sendEmail(
    managerEmail,
    `${title} - ${cityName}`,
    html
  )
}

/**
 * Send faulty equipment reminder
 */
export async function sendFaultyEquipmentReminder(
  managerEmail: string,
  managerName: string,
  cityName: string,
  items: { name: string; faultyDays: number; notes?: string }[],
  isFollowUp: boolean
): Promise<EmailResult> {
  const itemsList = items
    .map(item => `
      <tr>
        <td>${item.name}</td>
        <td>${item.faultyDays} ימים</td>
        <td>${item.notes || '-'}</td>
      </tr>
    `)
    .join('')

  const title = isFollowUp ? '⏰ תזכורת שנייה: ציוד תקול דורש תיקון' : '🔧 תזכורת: ציוד תקול דורש תיקון'

  const html = `
    <div class="container">
      <div class="header" style="background: ${isFollowUp ? '#ef4444' : '#f59e0b'};">
        <h1>${title}</h1>
      </div>
      <div class="content">
        <p>שלום ${managerName},</p>
        ${isFollowUp
          ? `<p><strong>זוהי תזכורת נוספת!</strong> הציוד הבא עדיין מסומן כתקול:</p>`
          : `<p>הציוד הבא בארון ${cityName} מסומן כתקול כבר מעל 3 שבועות:</p>`
        }

        <table>
          <thead>
            <tr>
              <th>פריט</th>
              <th>זמן בתקלה</th>
              <th>הערות</th>
            </tr>
          </thead>
          <tbody>
            ${itemsList}
          </tbody>
        </table>

        <div class="alert ${isFollowUp ? 'alert-danger' : ''}">
          ${isFollowUp
            ? 'יש לטפל בציוד התקול בהקדם האפשרי!'
            : 'מומלץ לטפל בציוד התקול או להחליפו.'
          }
        </div>

        <p>
          <a href="${getAppUrl()}" class="button">כניסה למערכת</a>
        </p>
      </div>
      <div class="footer">
        <p>מערכת ארון ציוד ידידים</p>
      </div>
    </div>
  `

  return sendEmail(
    managerEmail,
    `${title} - ${cityName}`,
    html
  )
}

/**
 * Monthly report data interface
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

/**
 * Send monthly report email
 */
export async function sendMonthlyReportEmail(
  managerEmail: string,
  managerName: string,
  data: MonthlyReportData
): Promise<EmailResult> {
  const topBorrowedList = data.topBorrowedItems.length > 0
    ? data.topBorrowedItems.map(item => `<li>${item.name}: ${item.count} השאלות</li>`).join('')
    : '<li>אין נתונים</li>'

  const lowStockList = data.lowStockItems.length > 0
    ? data.lowStockItems.map(item => `<li>${item.name}: ${item.quantity} יחידות</li>`).join('')
    : '<li>אין פריטים במלאי נמוך 👍</li>'

  const faultyList = data.faultyItems.length > 0
    ? data.faultyItems.map(item => `<li>${item.name}: ${item.days} ימים</li>`).join('')
    : '<li>אין ציוד תקול 👍</li>'

  const html = `
    <div class="container">
      <div class="header" style="background: #059669;">
        <h1>📊 דוח חודשי - ${data.cityName}</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px;">${data.periodStart} - ${data.periodEnd}</p>
      </div>
      <div class="content">
        <p>שלום ${managerName},</p>
        <p>להלן סיכום הפעילות החודשית בארון ${data.cityName}:</p>

        <h3>📈 סטטיסטיקות השאלות</h3>
        <table>
          <tr>
            <td><strong>סה"כ השאלות</strong></td>
            <td>${data.totalBorrows}</td>
          </tr>
          <tr>
            <td><strong>החזרות</strong></td>
            <td>${data.totalReturns}</td>
          </tr>
          <tr>
            <td><strong>ממתינות להחזרה</strong></td>
            <td>${data.pendingReturns}</td>
          </tr>
        </table>

        <h3>📋 סטטיסטיקות בקשות</h3>
        <table>
          <tr>
            <td><strong>בקשות פעילות</strong></td>
            <td>${data.activeRequestsCount}</td>
          </tr>
          <tr>
            <td><strong>בקשות שאושרו</strong></td>
            <td>${data.approvedRequestsCount}</td>
          </tr>
          <tr>
            <td><strong>בקשות שנדחו</strong></td>
            <td>${data.rejectedRequestsCount}</td>
          </tr>
        </table>

        <h3>🏆 הפריטים המושאלים ביותר</h3>
        <ul class="list">${topBorrowedList}</ul>

        <h3>📦 פריטים במלאי נמוך</h3>
        <ul class="list">${lowStockList}</ul>

        <h3>🔧 ציוד תקול</h3>
        <ul class="list">${faultyList}</ul>

        <p>
          <a href="${getAppUrl()}" class="button">כניסה למערכת</a>
        </p>
      </div>
      <div class="footer">
        <p>מערכת ארון ציוד ידידים</p>
        <p>דוח זה נשלח אוטומטית בתחילת כל חודש</p>
      </div>
    </div>
  `

  return sendEmail(
    managerEmail,
    `📊 דוח חודשי - ${data.cityName} (${data.periodStart} - ${data.periodEnd})`,
    html
  )
}
