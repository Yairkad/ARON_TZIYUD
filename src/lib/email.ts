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

// Modern inline styles for email compatibility (Gmail strips <style> tags)
const inlineStyles = {
  body: 'font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; direction: rtl; text-align: right; background-color: #f1f5f9; margin: 0; padding: 30px 20px;',
  container: 'max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); direction: rtl; text-align: right;',
  // Header variants
  header: 'padding: 40px 30px; text-align: center; position: relative;',
  headerPrimary: 'background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);',
  headerSuccess: 'background: linear-gradient(135deg, #059669 0%, #0d9488 100%);',
  headerWarning: 'background: linear-gradient(135deg, #d97706 0%, #ea580c 100%);',
  headerDanger: 'background: linear-gradient(135deg, #dc2626 0%, #be185d 100%);',
  headerInfo: 'background: linear-gradient(135deg, #0891b2 0%, #0284c7 100%);',
  headerIcon: 'width: 70px; height: 70px; background: rgba(255, 255, 255, 0.2); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 32px; border: 2px solid rgba(255, 255, 255, 0.3);',
  headerTitle: 'margin: 0; font-size: 26px; font-weight: 700; color: white; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);',
  headerSubtitle: 'color: rgba(255, 255, 255, 0.9); font-size: 14px; margin-top: 8px;',
  // Content
  content: 'padding: 35px 30px; direction: rtl; text-align: right;',
  greeting: 'font-size: 18px; color: #1e293b; font-weight: 600; margin-bottom: 20px;',
  contentText: 'color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 18px 0;',
  // Info cards
  infoCard: 'background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; padding: 20px; margin: 20px 0; border-right: 4px solid #3b82f6; direction: rtl; text-align: right;',
  infoCardWarning: 'background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-right-color: #f59e0b;',
  infoCardDanger: 'background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-right-color: #ef4444;',
  infoCardSuccess: 'background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-right-color: #10b981;',
  infoCardTitle: 'font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 10px; text-align: right;',
  infoCardContent: 'color: #64748b; font-size: 14px; line-height: 1.6; text-align: right;',
  // CTA Button
  ctaContainer: 'text-align: center; margin: 30px 0;',
  button: 'display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.4);',
  buttonWarning: 'background: linear-gradient(135deg, #d97706 0%, #ea580c 100%); box-shadow: 0 10px 25px -5px rgba(217, 119, 6, 0.4);',
  buttonSuccess: 'background: linear-gradient(135deg, #059669 0%, #0d9488 100%); box-shadow: 0 10px 25px -5px rgba(5, 150, 105, 0.4);',
  // Alert boxes
  alert: 'border-radius: 12px; padding: 16px 20px; margin: 20px 0; background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border: 1px solid #fcd34d; direction: rtl; text-align: right;',
  alertDanger: 'background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 1px solid #fca5a5;',
  alertInfo: 'background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #93c5fd;',
  alertText: 'font-size: 14px; line-height: 1.5; color: #92400e; text-align: right;',
  alertTextDanger: 'color: #991b1b;',
  alertTextInfo: 'color: #1e40af;',
  // Table
  table: 'width: 100%; border-collapse: separate; border-spacing: 0; margin: 20px 0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); direction: rtl;',
  th: 'background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 14px 16px; font-size: 13px; font-weight: 600; text-align: right;',
  td: 'padding: 14px 16px; font-size: 14px; color: #475569; background: white; border-bottom: 1px solid #f1f5f9; text-align: right;',
  // Items list
  itemRow: 'padding: 12px 16px; background: #f8fafc; border-radius: 10px; margin-bottom: 8px; direction: rtl; text-align: right;',
  itemIcon: 'display: inline-block; width: 40px; height: 40px; background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%); border-radius: 10px; text-align: center; line-height: 40px; font-size: 18px; margin-left: 12px; vertical-align: middle;',
  itemName: 'font-weight: 600; color: #1e293b; font-size: 14px; display: inline-block; vertical-align: middle;',
  itemMeta: 'font-size: 12px; color: #64748b; display: block; margin-top: 4px; margin-right: 52px;',
  // Stats
  statsGrid: 'display: flex; gap: 12px; margin: 20px 0;',
  statCard: 'flex: 1; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; padding: 16px; text-align: center;',
  statValue: 'font-size: 28px; font-weight: 800; color: #2563eb;',
  statLabel: 'font-size: 12px; color: #64748b; margin-top: 4px;',
  // Section title (stays right-aligned for RTL with right border)
  sectionTitle: 'font-size: 16px; font-weight: 700; color: #1e293b; margin: 25px 0 15px; padding-right: 12px; border-right: 4px solid #7c3aed; text-align: right;',
  // Divider
  divider: 'height: 1px; background: linear-gradient(90deg, transparent, #e2e8f0 20%, #e2e8f0 80%, transparent); margin: 25px 0;',
  // Footer
  footer: 'background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;',
  footerLogo: 'font-size: 18px; font-weight: 700; color: #334155; margin-bottom: 8px;',
  footerText: 'color: #94a3b8; font-size: 12px; line-height: 1.6;',
  // Legacy support
  list: 'list-style: none; padding: 0; margin: 15px 0; direction: rtl;',
  listItem: 'padding: 12px 16px; background: #f8fafc; border-radius: 10px; margin-bottom: 8px; color: #475569; text-align: right;',
}

// Header variant types
type HeaderVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info'
type AlertVariant = 'warning' | 'danger' | 'info'
type ButtonVariant = 'primary' | 'warning' | 'success'

const headerVariants: Record<HeaderVariant, string> = {
  primary: inlineStyles.headerPrimary,
  success: inlineStyles.headerSuccess,
  warning: inlineStyles.headerWarning,
  danger: inlineStyles.headerDanger,
  info: inlineStyles.headerInfo,
}

// Helper to create styled elements
const styled = {
  container: (content: string) => `<div style="${inlineStyles.container}" class="container">${content}</div>`,

  // Modern header with icon
  header: (title: string, emoji?: string, variant: HeaderVariant = 'primary', subtitle?: string) => `
    <div style="${inlineStyles.header} ${headerVariants[variant]}">
      ${emoji ? `<div style="${inlineStyles.headerIcon}">${emoji}</div>` : ''}
      <h1 style="${inlineStyles.headerTitle}">${title}</h1>
      ${subtitle ? `<p style="${inlineStyles.headerSubtitle}">${subtitle}</p>` : ''}
    </div>`,

  content: (html: string) => `<div style="${inlineStyles.content}">${html}</div>`,

  // Greeting text
  greeting: (name: string) => `<p style="${inlineStyles.greeting}">שלום ${name},</p>`,

  // Regular text
  text: (text: string) => `<p style="${inlineStyles.contentText}">${text}</p>`,

  // Info card with title
  infoCard: (title: string, content: string, variant: 'default' | 'warning' | 'danger' | 'success' = 'default') => {
    const variantStyle = variant === 'warning' ? inlineStyles.infoCardWarning :
                         variant === 'danger' ? inlineStyles.infoCardDanger :
                         variant === 'success' ? inlineStyles.infoCardSuccess : ''
    return `
      <div style="${inlineStyles.infoCard} ${variantStyle}">
        <div style="${inlineStyles.infoCardTitle}">${title}</div>
        <div style="${inlineStyles.infoCardContent}">${content}</div>
      </div>`
  },

  // Data rows inside info card (table-based for better RTL support)
  dataRow: (label: string, value: string) => `
    <table style="width: 100%; border-collapse: collapse; direction: rtl;">
      <tr>
        <td style="color: #64748b; font-size: 14px; padding: 10px 0; border-bottom: 1px dashed #e2e8f0; text-align: right;">${label}</td>
        <td style="color: #1e293b; font-weight: 600; font-size: 14px; padding: 10px 0; border-bottom: 1px dashed #e2e8f0; text-align: left;">${value}</td>
      </tr>
    </table>`,

  // CTA button with variants
  button: (text: string, href: string, variant: ButtonVariant = 'primary') => {
    const buttonStyle = variant === 'warning' ? `${inlineStyles.button} ${inlineStyles.buttonWarning}` :
                        variant === 'success' ? `${inlineStyles.button} ${inlineStyles.buttonSuccess}` :
                        inlineStyles.button
    return `<p style="${inlineStyles.ctaContainer}"><a href="${href}" style="${buttonStyle}">${text}</a></p>`
  },

  // Alert boxes
  alert: (html: string, variant: AlertVariant = 'warning') => {
    const alertStyle = variant === 'danger' ? inlineStyles.alertDanger :
                       variant === 'info' ? inlineStyles.alertInfo : inlineStyles.alert
    const textStyle = variant === 'danger' ? inlineStyles.alertTextDanger :
                      variant === 'info' ? inlineStyles.alertTextInfo : inlineStyles.alertText
    return `<div style="${alertStyle}"><p style="${textStyle}">${html}</p></div>`
  },

  // Modern footer
  footer: (text: string, subtext?: string) => `
    <div style="${inlineStyles.footer}">
      <div style="${inlineStyles.footerLogo}">🏢 ארון ציוד ידידים</div>
      <p style="${inlineStyles.footerText}">${text}</p>
      ${subtext ? `<p style="${inlineStyles.footerText}">${subtext}</p>` : ''}
    </div>`,

  // Modern table
  table: (headers: string[], rows: string[][]) => {
    const headerRow = headers.map(h => `<th style="${inlineStyles.th}">${h}</th>`).join('')
    const bodyRows = rows.map(row => `<tr>${row.map(cell => `<td style="${inlineStyles.td}">${cell}</td>`).join('')}</tr>`).join('')
    return `<table style="${inlineStyles.table}"><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table>`
  },

  // Section title
  sectionTitle: (emoji: string, title: string) => `<h3 style="${inlineStyles.sectionTitle}">${emoji} ${title}</h3>`,

  // Items list (modern card style)
  list: (items: string[]) => `<div style="${inlineStyles.list}">${items.map(item => `<div style="${inlineStyles.listItem}">📌 ${item}</div>`).join('')}</div>`,

  // Item row with icon (RTL layout)
  itemRow: (icon: string, name: string, meta: string) => `
    <div style="${inlineStyles.itemRow}">
      <span style="${inlineStyles.itemIcon}">${icon}</span>
      <span style="${inlineStyles.itemName}">${name}</span>
      <span style="${inlineStyles.itemMeta}">${meta}</span>
    </div>`,

  // Stats grid
  statsGrid: (stats: { value: string | number; label: string }[]) => `
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr>
        ${stats.map(stat => `
          <td style="${inlineStyles.statCard}">
            <div style="${inlineStyles.statValue}">${stat.value}</div>
            <div style="${inlineStyles.statLabel}">${stat.label}</div>
          </td>
        `).join('')}
      </tr>
    </table>`,

  // Divider
  divider: () => `<div style="${inlineStyles.divider}"></div>`,
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
          <meta name="color-scheme" content="light only">
          <meta name="supported-color-schemes" content="light only">
          <style>
            :root { color-scheme: light only; }
            @media (prefers-color-scheme: dark) {
              body, .body { background-color: #f1f5f9 !important; }
              .container { background-color: #ffffff !important; }
              * { color: inherit !important; }
            }
          </style>
        </head>
        <body style="${inlineStyles.body}" class="body">
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
  const itemsHtml = items
    .map(item => styled.itemRow('📦', item.name, `כמות: ${item.quantity}`))
    .join('')

  const html = styled.container(
    styled.header('בקשה חדשה לציוד!', '🔔', 'info', `ארון ציוד - ${cityName}`) +
    styled.content(
      styled.greeting(managerName) +
      styled.text(`התקבלה בקשה חדשה לציוד בארון ${cityName}.`) +
      styled.infoCard(
        '👤 פרטי המבקש',
        styled.dataRow('שם:', requesterName) +
        styled.dataRow('טלפון:', `<a href="tel:${requesterPhone}" style="color: #2563eb; text-decoration: none; font-weight: 600;">${requesterPhone}</a>`)
      ) +
      styled.sectionTitle('📦', 'פריטים מבוקשים') +
      `<div style="margin: 15px 0;">${itemsHtml}</div>` +
      styled.button('צפייה בבקשה 📋', getAppUrl())
    ) +
    styled.footer('מערכת לניהול השאלת ציוד חירום', 'יש לך 24 שעות לאשר או לדחות את הבקשה')
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
    styled.header('איפוס סיסמה', '🔑', 'primary', 'אבטחת החשבון שלך') +
    styled.content(
      styled.greeting(recipientName) +
      styled.text('קיבלנו בקשה לאיפוס הסיסמה שלך במערכת ארון ציוד ידידים.') +
      styled.text('לחץ על הכפתור הבא כדי לבחור סיסמה חדשה:') +
      styled.button('איפוס סיסמה 🔐', resetLink) +
      styled.alert('<strong>⏰ שים לב:</strong> הקישור תקף לשעה אחת בלבד.') +
      styled.divider() +
      styled.text('<span style="color: #94a3b8; font-size: 13px;">אם לא ביקשת לאפס את הסיסמה, התעלם מהודעה זו. הסיסמה שלך לא תשתנה.</span>')
    ) +
    styled.footer('שמירה על אבטחת החשבון שלך')
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
    styled.header('ברוך הבא!', '🎉', 'primary', 'מערכת ארון ציוד ידידים') +
    styled.content(
      styled.greeting(recipientName) +
      styled.text(`ברוך הבא למערכת ארון ציוד ידידים - ${cityName}!`) +
      styled.text('חשבונך נוצר בהצלחה. כעת תוכל לגשת למערכת ולנהל את ארון הציוד שלך.') +
      styled.infoCard(
        '✅ החשבון שלך מוכן',
        'לחץ על הכפתור למטה כדי להגדיר את הסיסמה שלך ולהתחיל.',
        'success'
      ) +
      styled.button('הגדרת סיסמה 🔐', resetLink) +
      styled.alert('<strong>⏰ שים לב:</strong> הקישור תקף לשעה אחת בלבד. לאחר הגדרת הסיסמה, תוכל להתחבר למערכת בכל עת.')
    ) +
    styled.footer('מערכת לניהול השאלת ציוד חירום')
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
    styled.header('אימות כתובת מייל', '✉️', 'info', 'עדכון פרטי חשבון') +
    styled.content(
      styled.greeting(recipientName) +
      styled.text('כתובת המייל שלך במערכת ארון ציוד ידידים עודכנה.') +
      styled.text('לחץ על הכפתור הבא כדי לאמת את כתובת המייל החדשה:') +
      styled.button('אימות כתובת מייל ✓', verifyLink) +
      styled.alert('<strong>ℹ️ שים לב:</strong> הקישור תקף ל-24 שעות בלבד.', 'info') +
      styled.divider() +
      styled.text('<span style="color: #94a3b8; font-size: 13px;">אם לא ביקשת לשנות את כתובת המייל, פנה למנהל המערכת מיידית.</span>')
    ) +
    styled.footer('שמירה על אבטחת החשבון שלך')
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
    styled.header('הודעה מארון ציוד ידידים', '📧', 'primary') +
    styled.content(
      (recipientName ? styled.greeting(recipientName) : '') +
      `<div style="${inlineStyles.contentText}; white-space: pre-wrap;">${message}</div>` +
      styled.button('כניסה למערכת 🚀', getAppUrl())
    ) +
    styled.footer('מערכת לניהול השאלת ציוד חירום')
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
  const tableRows = items.map(item => {
    const status = item.quantity <= Math.floor(item.minQuantity / 2)
      ? '<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #fee2e2; color: #991b1b;">קריטי</span>'
      : '<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #fef3c7; color: #92400e;">נמוך</span>'
    return [item.name, String(item.quantity), String(item.minQuantity), status]
  })

  const html = styled.container(
    styled.header('התראת מלאי נמוך', '📦', 'warning', `ארון ציוד - ${cityName}`) +
    styled.content(
      styled.greeting(managerName) +
      styled.text(`הפריטים הבאים בארון ${cityName} הגיעו למלאי נמוך:`) +
      styled.table(['פריט', 'כמות נוכחית', 'מינימום', 'סטטוס'], tableRows) +
      styled.alert('<strong>⚠️ מומלץ להשלים את המלאי בהקדם</strong><br>מלאי נמוך עלול לפגוע ביכולת לספק ציוד בחירום.') +
      styled.button('צפייה במלאי 📊', getAppUrl(), 'warning')
    ) +
    styled.footer('התראה אוטומטית ממערכת ניהול המלאי')
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
  const tableRows = items.map(item => {
    const status = item.quantity <= Math.floor(item.minQuantity / 2)
      ? '<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #fee2e2; color: #991b1b;">קריטי</span>'
      : '<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #fef3c7; color: #92400e;">נמוך</span>'
    return [item.name, String(item.quantity), String(item.minQuantity), status]
  })
  const title = isFollowUp ? 'תזכורת שנייה: מילוי מלאי נדרש' : 'תזכורת: מילוי מלאי נדרש'
  const emoji = isFollowUp ? '🚨' : '📦'
  const variant = isFollowUp ? 'danger' : 'warning' as const

  const html = styled.container(
    styled.header(title, emoji, variant, `ארון ציוד - ${cityName}`) +
    styled.content(
      styled.greeting(managerName) +
      (isFollowUp
        ? styled.text('<strong style="color: #dc2626;">זוהי תזכורת נוספת!</strong> הפריטים הבאים עדיין במלאי נמוך:')
        : styled.text(`הפריטים הבאים בארון ${cityName} נמצאים במלאי נמוך:`)) +
      styled.table(['פריט', 'כמות נוכחית', 'מינימום', 'סטטוס'], tableRows) +
      styled.alert(
        isFollowUp
          ? '<strong>🚨 פעולה נדרשת!</strong> יש למלא את המלאי בהקדם האפשרי!'
          : '<strong>⚠️ מומלץ להשלים את המלאי בהקדם</strong>',
        isFollowUp ? 'danger' : 'warning'
      ) +
      styled.button('צפייה במלאי 📊', getAppUrl(), isFollowUp ? 'warning' : 'warning')
    ) +
    styled.footer('התראה אוטומטית ממערכת ניהול המלאי')
  )

  return sendEmail(
    managerEmail,
    `${emoji} ${title} - ${cityName}`,
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
  const title = isFollowUp ? 'ציוד תקול דורש טיפול' : 'תזכורת: ציוד תקול דורש תיקון'
  const emoji = isFollowUp ? '🚨' : '🔧'
  const variant = isFollowUp ? 'danger' : 'warning' as const
  const subtitle = isFollowUp ? 'תזכורת שנייה - פעולה נדרשת' : `ארון ציוד - ${cityName}`

  const html = styled.container(
    styled.header(title, emoji, variant, subtitle) +
    styled.content(
      styled.greeting(managerName) +
      (isFollowUp
        ? styled.text('<strong style="color: #dc2626;">זוהי תזכורת נוספת!</strong> הציוד הבא עדיין מסומן כתקול:')
        : styled.text(`הציוד הבא בארון ${cityName} מסומן כתקול כבר מעל 3 שבועות:`)) +
      styled.table(['פריט', 'זמן בתקלה', 'הערות'], tableRows) +
      styled.alert(
        isFollowUp
          ? '<strong>🚨 פעולה נדרשת!</strong> יש לטפל בציוד התקול בהקדם האפשרי או להחליפו כדי להבטיח מוכנות לחירום.'
          : '<strong>⚠️ מומלץ לטפל בציוד התקול או להחליפו</strong>',
        isFollowUp ? 'danger' : 'warning'
      ) +
      styled.button('ניהול ציוד 🛠️', getAppUrl())
    ) +
    styled.footer('ציוד תקין = מוכנות מלאה לחירום')
  )

  return sendEmail(
    managerEmail,
    `${emoji} ${title} - ${cityName}`,
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
  // Top borrowed items with medals
  const medals = ['🥇', '🥈', '🥉']
  const topBorrowedHtml = data.topBorrowedItems.length > 0
    ? data.topBorrowedItems.slice(0, 5).map((item, idx) =>
        styled.itemRow(medals[idx] || '📦', item.name, `${item.count} השאלות`)
      ).join('')
    : styled.infoCard('📊 אין נתונים', 'לא נרשמו השאלות בתקופה זו', 'default')

  // Low stock items
  const lowStockHtml = data.lowStockItems.length > 0
    ? data.lowStockItems.map(item =>
        styled.itemRow('⚠️', item.name, `${item.quantity} יחידות`)
      ).join('')
    : styled.infoCard('✅ מצב מלאי', 'כל הפריטים במלאי תקין - אין פריטים במלאי נמוך 👍', 'success')

  // Faulty items
  const faultyHtml = data.faultyItems.length > 0
    ? data.faultyItems.map(item =>
        styled.itemRow('🔧', item.name, `${item.days} ימים`)
      ).join('')
    : styled.infoCard('✅ מצב ציוד', 'אין ציוד תקול 👍', 'success')

  const html = styled.container(
    styled.header('דוח חודשי', '📊', 'success', `ארון ציוד ${data.cityName} • ${data.periodStart} - ${data.periodEnd}`) +
    styled.content(
      styled.greeting(managerName) +
      styled.text(`להלן סיכום הפעילות החודשית בארון ${data.cityName}:`) +

      styled.sectionTitle('📈', 'סטטיסטיקות השאלות') +
      styled.statsGrid([
        { value: data.totalBorrows, label: 'השאלות' },
        { value: data.totalReturns, label: 'החזרות' },
        { value: data.pendingReturns, label: 'ממתינות' },
      ]) +

      styled.sectionTitle('📋', 'סטטיסטיקות בקשות') +
      styled.statsGrid([
        { value: data.approvedRequestsCount, label: 'אושרו' },
        { value: data.rejectedRequestsCount, label: 'נדחו' },
        { value: data.activeRequestsCount, label: 'ממתינות' },
      ]) +

      styled.sectionTitle('🏆', 'הפריטים המושאלים ביותר') +
      `<div style="margin: 15px 0;">${topBorrowedHtml}</div>` +

      styled.sectionTitle('📦', 'פריטים במלאי נמוך') +
      `<div style="margin: 15px 0;">${lowStockHtml}</div>` +

      styled.sectionTitle('🔧', 'ציוד תקול') +
      `<div style="margin: 15px 0;">${faultyHtml}</div>` +

      styled.button('צפייה בדוח מלא 📈', getAppUrl(), 'success')
    ) +
    styled.footer('דוח זה נשלח אוטומטית בתחילת כל חודש')
  )

  return sendEmail(
    managerEmail,
    `📊 דוח חודשי - ${data.cityName} (${data.periodStart} - ${data.periodEnd})`,
    html
  )
}
