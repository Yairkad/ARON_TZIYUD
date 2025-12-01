/**
 * Email Service using SMTP (nodemailer)
 *
 * Required environment variables:
 * - SMTP_HOST: SMTP server host (e.g., smtp.gmail.com)
 * - SMTP_USER: Email address to send from
 * - SMTP_PASSWORD: App password or SMTP password
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
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'

  return nodemailer.createTransport({
    host,
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
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

// Inline styles for email compatibility (Gmail strips <style> tags)
const inlineStyles = {
  body: 'font-family: Arial, sans-serif; direction: rtl; text-align: right; background-color: #f3f4f6; margin: 0; padding: 20px;',
  container: 'max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);',
  header: 'background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: white; padding: 30px 20px; text-align: center;',
  headerTitle: 'margin: 0; font-size: 24px; font-weight: bold;',
  content: 'padding: 30px 20px;',
  contentText: 'color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;',
  button: 'display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;',
  alert: 'background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; color: #92400e;',
  alertDanger: 'background: #fee2e2; border: 2px solid #ef4444; padding: 15px; border-radius: 8px; margin: 20px 0; color: #991b1b;',
  footer: 'background: #f9fafb; padding: 20px; text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb;',
  table: 'width: 100%; border-collapse: collapse; margin: 15px 0;',
  th: 'padding: 12px; border: 1px solid #e5e7eb; text-align: right; background: #f3f4f6; font-weight: bold; color: #374151;',
  td: 'padding: 12px; border: 1px solid #e5e7eb; text-align: right; color: #4b5563;',
  list: 'list-style: none; padding: 0; margin: 15px 0;',
  listItem: 'padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #4b5563;',
}

// Helper to create styled elements
const styled = {
  container: (content: string) => `<div style="${inlineStyles.container}">${content}</div>`,
  header: (title: string, emoji?: string) => `<div style="${inlineStyles.header}"><h1 style="${inlineStyles.headerTitle}">${emoji ? emoji + ' ' : ''}${title}</h1></div>`,
  content: (html: string) => `<div style="${inlineStyles.content}">${html}</div>`,
  text: (text: string) => `<p style="${inlineStyles.contentText}">${text}</p>`,
  button: (text: string, href: string) => `<p style="text-align: center; margin: 25px 0;"><a href="${href}" style="${inlineStyles.button}">${text}</a></p>`,
  alert: (html: string, danger = false) => `<div style="${danger ? inlineStyles.alertDanger : inlineStyles.alert}">${html}</div>`,
  footer: (text: string) => `<div style="${inlineStyles.footer}">${text}</div>`,
  table: (headers: string[], rows: string[][]) => {
    const headerRow = headers.map(h => `<th style="${inlineStyles.th}">${h}</th>`).join('')
    const bodyRows = rows.map(row => `<tr>${row.map(cell => `<td style="${inlineStyles.td}">${cell}</td>`).join('')}</tr>`).join('')
    return `<table style="${inlineStyles.table}"><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table>`
  },
  list: (items: string[]) => `<ul style="${inlineStyles.list}">${items.map(item => `<li style="${inlineStyles.listItem}">${item}</li>`).join('')}</ul>`,
}

/**
 * Send email using Gmail SMTP with inline styles
 */
async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<EmailResult> {
  try {
    // Check if SMTP credentials are configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.error('SMTP credentials not configured')
      return { success: false, error: 'SMTP credentials not configured' }
    }

    const transporter = createTransporter()

    await transporter.sendMail({
      from: `"ארון ציוד ידידים" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="${inlineStyles.body}">
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
  const itemsListHtml = items
    .map(item => `${item.name} (כמות: ${item.quantity})`)

  const html = styled.container(
    styled.header('בקשה חדשה לציוד', '🔔') +
    styled.content(
      styled.text(`שלום ${managerName},`) +
      styled.text(`התקבלה בקשה חדשה לציוד בארון ${cityName}:`) +
      styled.alert(
        `<strong>פרטי המבקש:</strong><br>` +
        `שם: ${requesterName}<br>` +
        `טלפון: <a href="tel:${requesterPhone}" style="color: #92400e;">${requesterPhone}</a>`
      ) +
      `<p style="${inlineStyles.contentText}"><strong>פריטים מבוקשים:</strong></p>` +
      styled.list(itemsListHtml) +
      styled.button('כניסה למערכת', getAppUrl())
    ) +
    styled.footer('מערכת ארון ציוד ידידים')
  )

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

  const html = styled.container(
    styled.header('איפוס סיסמה', '🔑') +
    styled.content(
      styled.text(`שלום ${recipientName},`) +
      styled.text('קיבלנו בקשה לאיפוס הסיסמה שלך במערכת ארון ציוד ידידים.') +
      styled.text('לחץ על הכפתור הבא כדי לאפס את הסיסמה:') +
      styled.button('איפוס סיסמה', resetLink) +
      styled.alert('<strong>שים לב:</strong> הקישור תקף לשעה אחת בלבד.') +
      styled.text('אם לא ביקשת לאפס את הסיסמה, התעלם מהודעה זו.')
    ) +
    styled.footer('מערכת ארון ציוד ידידים')
  )

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

  const html = styled.container(
    styled.header('ברוך הבא!', '🎉') +
    styled.content(
      styled.text(`שלום ${recipientName},`) +
      styled.text(`ברוך הבא למערכת ארון ציוד ידידים - ${cityName}!`) +
      styled.text('חשבונך נוצר בהצלחה. לחץ על הכפתור הבא כדי להגדיר את הסיסמה שלך:') +
      styled.button('הגדרת סיסמה', resetLink) +
      styled.alert('<strong>שים לב:</strong> הקישור תקף לשעה אחת בלבד.') +
      styled.text('לאחר הגדרת הסיסמה, תוכל להתחבר למערכת ולנהל את ארון הציוד.')
    ) +
    styled.footer('מערכת ארון ציוד ידידים')
  )

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

  const html = styled.container(
    styled.header('אימות כתובת מייל', '✉️') +
    styled.content(
      styled.text(`שלום ${recipientName},`) +
      styled.text('כתובת המייל שלך במערכת ארון ציוד ידידים עודכנה.') +
      styled.text('לחץ על הכפתור הבא כדי לאמת את כתובת המייל החדשה:') +
      styled.button('אימות כתובת מייל', verifyLink) +
      styled.alert('<strong>שים לב:</strong> הקישור תקף ל-24 שעות בלבד.') +
      styled.text('אם לא ביקשת לשנות את כתובת המייל, פנה למנהל המערכת.')
    ) +
    styled.footer('מערכת ארון ציוד ידידים')
  )

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
  const html = styled.container(
    styled.header('הודעה מארון ציוד ידידים', '📧') +
    styled.content(
      (recipientName ? styled.text(`שלום ${recipientName},`) : '') +
      `<div style="${inlineStyles.contentText} white-space: pre-wrap;">${message}</div>`
    ) +
    styled.footer('מערכת ארון ציוד ידידים')
  )

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
  const tableRows = items.map(item => [item.name, String(item.quantity), String(item.minQuantity)])

  const html = styled.container(
    `<div style="${inlineStyles.header} background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">` +
      `<h1 style="${inlineStyles.headerTitle}">📦 התראת מלאי נמוך</h1>` +
    '</div>' +
    styled.content(
      styled.text(`שלום ${managerName},`) +
      styled.text(`הפריטים הבאים בארון ${cityName} הגיעו למלאי נמוך:`) +
      styled.table(['פריט', 'כמות נוכחית', 'כמות מינימלית'], tableRows) +
      styled.alert('מומלץ להשלים את המלאי בהקדם האפשרי.') +
      styled.button('כניסה למערכת', getAppUrl())
    ) +
    styled.footer('מערכת ארון ציוד ידידים')
  )

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
  const tableRows = items.map(item => [item.name, String(item.quantity), String(item.minQuantity)])
  const title = isFollowUp ? '⏰ תזכורת שנייה: מילוי מלאי נדרש' : '📦 תזכורת: מילוי מלאי נדרש'
  const headerColor = isFollowUp ? '#ef4444 0%, #dc2626 100%' : '#f59e0b 0%, #d97706 100%'

  const html = styled.container(
    `<div style="${inlineStyles.header} background: linear-gradient(135deg, ${headerColor});">` +
      `<h1 style="${inlineStyles.headerTitle}">${title}</h1>` +
    '</div>' +
    styled.content(
      styled.text(`שלום ${managerName},`) +
      (isFollowUp
        ? styled.text(`<strong>זוהי תזכורת נוספת!</strong> הפריטים הבאים עדיין במלאי נמוך:`)
        : styled.text(`הפריטים הבאים בארון ${cityName} נמצאים במלאי נמוך:`)) +
      styled.table(['פריט', 'כמות נוכחית', 'כמות מינימלית'], tableRows) +
      styled.alert(isFollowUp ? 'יש למלא את המלאי בהקדם האפשרי!' : 'מומלץ להשלים את המלאי בהקדם.', isFollowUp) +
      styled.button('כניסה למערכת', getAppUrl())
    ) +
    styled.footer('מערכת ארון ציוד ידידים')
  )

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
  const tableRows = items.map(item => [item.name, `${item.faultyDays} ימים`, item.notes || '-'])
  const title = isFollowUp ? '⏰ תזכורת שנייה: ציוד תקול דורש תיקון' : '🔧 תזכורת: ציוד תקול דורש תיקון'
  const headerColor = isFollowUp ? '#ef4444 0%, #dc2626 100%' : '#f59e0b 0%, #d97706 100%'

  const html = styled.container(
    `<div style="${inlineStyles.header} background: linear-gradient(135deg, ${headerColor});">` +
      `<h1 style="${inlineStyles.headerTitle}">${title}</h1>` +
    '</div>' +
    styled.content(
      styled.text(`שלום ${managerName},`) +
      (isFollowUp
        ? styled.text(`<strong>זוהי תזכורת נוספת!</strong> הציוד הבא עדיין מסומן כתקול:`)
        : styled.text(`הציוד הבא בארון ${cityName} מסומן כתקול כבר מעל 3 שבועות:`)) +
      styled.table(['פריט', 'זמן בתקלה', 'הערות'], tableRows) +
      styled.alert(isFollowUp ? 'יש לטפל בציוד התקול בהקדם האפשרי!' : 'מומלץ לטפל בציוד התקול או להחליפו.', isFollowUp) +
      styled.button('כניסה למערכת', getAppUrl())
    ) +
    styled.footer('מערכת ארון ציוד ידידים')
  )

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
  const topBorrowedItems = data.topBorrowedItems.length > 0
    ? data.topBorrowedItems.map(item => `${item.name}: ${item.count} השאלות`)
    : ['אין נתונים']

  const lowStockItems = data.lowStockItems.length > 0
    ? data.lowStockItems.map(item => `${item.name}: ${item.quantity} יחידות`)
    : ['אין פריטים במלאי נמוך 👍']

  const faultyItems = data.faultyItems.length > 0
    ? data.faultyItems.map(item => `${item.name}: ${item.days} ימים`)
    : ['אין ציוד תקול 👍']

  const sectionTitle = (emoji: string, title: string) =>
    `<h3 style="color: #374151; margin: 25px 0 10px 0; font-size: 18px;">${emoji} ${title}</h3>`

  const html = styled.container(
    `<div style="${inlineStyles.header} background: linear-gradient(135deg, #059669 0%, #047857 100%);">` +
      `<h1 style="${inlineStyles.headerTitle}">📊 דוח חודשי - ${data.cityName}</h1>` +
      `<p style="margin: 5px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.9);">${data.periodStart} - ${data.periodEnd}</p>` +
    '</div>' +
    styled.content(
      styled.text(`שלום ${managerName},`) +
      styled.text(`להלן סיכום הפעילות החודשית בארון ${data.cityName}:`) +

      sectionTitle('📈', 'סטטיסטיקות השאלות') +
      styled.table(
        ['סה"כ השאלות', 'החזרות', 'ממתינות להחזרה'],
        [[String(data.totalBorrows), String(data.totalReturns), String(data.pendingReturns)]]
      ) +

      sectionTitle('📋', 'סטטיסטיקות בקשות') +
      styled.table(
        ['בקשות פעילות', 'בקשות שאושרו', 'בקשות שנדחו'],
        [[String(data.activeRequestsCount), String(data.approvedRequestsCount), String(data.rejectedRequestsCount)]]
      ) +

      sectionTitle('🏆', 'הפריטים המושאלים ביותר') +
      styled.list(topBorrowedItems) +

      sectionTitle('📦', 'פריטים במלאי נמוך') +
      styled.list(lowStockItems) +

      sectionTitle('🔧', 'ציוד תקול') +
      styled.list(faultyItems) +

      styled.button('כניסה למערכת', getAppUrl())
    ) +
    styled.footer('מערכת ארון ציוד ידידים<br>דוח זה נשלח אוטומטית בתחילת כל חודש')
  )

  return sendEmail(
    managerEmail,
    `📊 דוח חודשי - ${data.cityName} (${data.periodStart} - ${data.periodEnd})`,
    html
  )
}
