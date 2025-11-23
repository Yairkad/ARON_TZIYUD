// WhatsApp Business API utilities for sending messages
// Using Meta's Cloud API

export interface WhatsAppMessageResult {
  success: boolean
  messageId?: string
  error?: string
}

interface WhatsAppTextMessage {
  messaging_product: 'whatsapp'
  to: string
  type: 'text'
  text: {
    body: string
  }
}

interface WhatsAppTemplateMessage {
  messaging_product: 'whatsapp'
  to: string
  type: 'template'
  template: {
    name: string
    language: {
      code: string
    }
    components?: Array<{
      type: 'body' | 'header'
      parameters: Array<{
        type: 'text'
        text: string
      }>
    }>
  }
}

/**
 * Format phone number for WhatsApp API (must include country code, no special chars)
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '')

  // If starts with 0, assume Israeli number and add 972
  if (cleaned.startsWith('0')) {
    cleaned = '972' + cleaned.substring(1)
  }

  // If doesn't start with country code, assume Israeli
  if (!cleaned.startsWith('972') && cleaned.length === 9) {
    cleaned = '972' + cleaned
  }

  return cleaned
}

/**
 * Send a simple text message via WhatsApp
 */
export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<WhatsAppMessageResult> {
  try {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

    if (!accessToken || !phoneNumberId) {
      console.error('❌ WhatsApp credentials not configured')
      return { success: false, error: 'WhatsApp service not configured' }
    }

    const formattedPhone = formatPhoneNumber(phone)

    const payload: WhatsAppTextMessage = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'text',
      text: {
        body: message
      }
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    )

    const result = await response.json()

    if (!response.ok) {
      console.error('WhatsApp API error:', result)
      return {
        success: false,
        error: result.error?.message || 'Failed to send message'
      }
    }

    console.log('✅ WhatsApp message sent:', result.messages?.[0]?.id)
    return {
      success: true,
      messageId: result.messages?.[0]?.id
    }

  } catch (error) {
    console.error('WhatsApp sending error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Send a template message via WhatsApp (for approved templates only)
 */
export async function sendWhatsAppTemplate(
  phone: string,
  templateName: string,
  parameters: string[] = []
): Promise<WhatsAppMessageResult> {
  try {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

    if (!accessToken || !phoneNumberId) {
      console.error('❌ WhatsApp credentials not configured')
      return { success: false, error: 'WhatsApp service not configured' }
    }

    const formattedPhone = formatPhoneNumber(phone)

    const payload: WhatsAppTemplateMessage = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'he' // Hebrew
        },
        ...(parameters.length > 0 && {
          components: [{
            type: 'body',
            parameters: parameters.map(text => ({
              type: 'text' as const,
              text
            }))
          }]
        })
      }
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    )

    const result = await response.json()

    if (!response.ok) {
      console.error('WhatsApp API error:', result)
      return {
        success: false,
        error: result.error?.message || 'Failed to send template'
      }
    }

    console.log('✅ WhatsApp template sent:', result.messages?.[0]?.id)
    return {
      success: true,
      messageId: result.messages?.[0]?.id
    }

  } catch (error) {
    console.error('WhatsApp sending error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Send welcome message with temporary password to new user
 */
export async function sendWelcomeWhatsApp(
  phone: string,
  userName: string,
  tempPassword: string,
  cityName: string
): Promise<WhatsAppMessageResult> {
  const message = `שלום ${userName}! 🎉

ברוך הבא למערכת ארון ציוד ידידים - ${cityName}

פרטי ההתחברות שלך:
🔑 סיסמה זמנית: ${tempPassword}

⚠️ מומלץ להחליף את הסיסמה מיד לאחר הכניסה הראשונה.

קישור למערכת:
${process.env.NEXT_PUBLIC_APP_URL}/login

בהצלחה! 🚀`

  return sendWhatsAppMessage(phone, message)
}

/**
 * Send password reset token to user
 */
export async function sendPasswordResetWhatsApp(
  phone: string,
  userName: string,
  resetToken: string
): Promise<WhatsAppMessageResult> {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`

  const message = `שלום ${userName},

קיבלנו בקשה לאיפוס סיסמה עבור חשבונך במערכת ארון ציוד ידידים.

🔗 קישור לאיפוס סיסמה:
${resetUrl}

⏰ הקישור תקף לשעה אחת בלבד.

אם לא ביקשת איפוס סיסמה - התעלם מהודעה זו.`

  return sendWhatsAppMessage(phone, message)
}

/**
 * Send alert to manager about anomaly/important event
 */
export async function sendManagerAlertWhatsApp(
  phone: string,
  managerName: string,
  alertType: 'low_stock' | 'new_request' | 'overdue_return' | 'system_alert',
  details: string
): Promise<WhatsAppMessageResult> {
  const alertEmojis = {
    low_stock: '📦⚠️',
    new_request: '📋🆕',
    overdue_return: '⏰🔴',
    system_alert: '🚨'
  }

  const alertTitles = {
    low_stock: 'התראת מלאי נמוך',
    new_request: 'בקשה חדשה ממתינה',
    overdue_return: 'איחור בהחזרת ציוד',
    system_alert: 'התראת מערכת'
  }

  const message = `${alertEmojis[alertType]} ${alertTitles[alertType]}

שלום ${managerName},

${details}

מערכת ארון ציוד ידידים`

  return sendWhatsAppMessage(phone, message)
}

/**
 * Send notification about request status change
 */
export async function sendRequestStatusWhatsApp(
  phone: string,
  userName: string,
  status: 'approved' | 'rejected' | 'returned',
  equipmentName: string,
  notes?: string
): Promise<WhatsAppMessageResult> {
  const statusMessages = {
    approved: `✅ בקשתך לציוד "${equipmentName}" אושרה!\n\nאנא הגע לארון לאיסוף הציוד.`,
    rejected: `❌ בקשתך לציוד "${equipmentName}" נדחתה.${notes ? `\n\nסיבה: ${notes}` : ''}`,
    returned: `🔄 הציוד "${equipmentName}" הוחזר בהצלחה.\n\nתודה רבה!`
  }

  const message = `שלום ${userName},

${statusMessages[status]}

מערכת ארון ציוד ידידים`

  return sendWhatsAppMessage(phone, message)
}
