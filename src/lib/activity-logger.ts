import { supabaseServer } from './supabase-server'

/**
 * Activity Logger
 * Logs all manager actions for audit trail
 */

export interface LogActivityParams {
  cityId: string
  managerName: string
  action: string
  details?: Record<string, any>
  ipAddress?: string
}

/**
 * Logs a manager action to the activity log
 * @param params Activity log parameters
 * @returns Success status
 */
export async function logActivity({
  cityId,
  managerName,
  action,
  details,
  ipAddress
}: LogActivityParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseServer
      .from('activity_log')
      .insert({
        city_id: cityId,
        manager_name: managerName,
        action,
        details: details || null,
        ip_address: ipAddress || null
      })

    if (error) {
      console.error('Failed to log activity:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Activity logging error:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Common action types for consistency
 */
export const ActivityActions = {
  // Authentication
  LOGIN: 'login',
  LOGOUT: 'logout',
  LOGIN_FAILED: 'login_failed',

  // Equipment Management
  EQUIPMENT_ADDED: 'equipment_added',
  EQUIPMENT_UPDATED: 'equipment_updated',
  EQUIPMENT_DELETED: 'equipment_deleted',

  // Borrow/Return
  BORROW_APPROVED: 'borrow_approved',
  RETURN_PROCESSED: 'return_processed',
  BORROW_STATUS_CHANGED: 'borrow_status_changed',

  // Request Management
  REQUEST_APPROVED: 'request_approved',
  REQUEST_REJECTED: 'request_rejected',
  REQUEST_CANCELLED: 'request_cancelled',
  TOKEN_REGENERATED: 'token_regenerated',

  // Settings
  CITY_SETTINGS_UPDATED: 'city_settings_updated',
  PASSWORD_CHANGED: 'password_changed',

  // Other
  EXPORT_DATA: 'export_data'
} as const

/**
 * Get recent activity logs for a city
 * @param cityId City ID
 * @param limit Number of records to fetch (default: 50)
 * @returns Activity logs
 */
export async function getActivityLogs(cityId: string, limit: number = 50) {
  try {
    const { data, error } = await supabaseServer
      .from('activity_log')
      .select('*')
      .eq('city_id', cityId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Failed to fetch activity logs:', error)
      return { success: false, error: error.message, logs: [] }
    }

    return { success: true, logs: data || [] }
  } catch (error) {
    console.error('Error fetching activity logs:', error)
    return { success: false, error: String(error), logs: [] }
  }
}
