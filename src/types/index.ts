export interface City {
  id: string
  name: string
  manager1_name: string
  manager1_phone: string
  manager2_name?: string | null
  manager2_phone?: string | null
  location_url?: string | null
  token_location_url?: string | null
  lat?: number | null
  lng?: number | null
  token_lat?: number | null
  token_lng?: number | null
  password: string
  is_active: boolean
  request_mode?: 'direct' | 'request'
  cabinet_code?: string | null
  require_call_id?: boolean
  hide_navigation?: boolean
  enable_push_notifications?: boolean
  admin_emails?: string[] | null
  created_at: string
  updated_at: string
}

export interface Equipment {
  id: string
  name: string
  quantity: number
  city_id: string
  equipment_status: 'working' | 'faulty'
  is_consumable: boolean
  created_at: string
  updated_at: string
}

export interface BorrowHistory {
  id: string
  name: string
  phone: string
  equipment_id: string
  equipment_name: string
  city_id: string
  borrow_date: string
  return_date?: string
  status: 'borrowed' | 'returned'
  equipment_status?: 'working' | 'faulty'
  return_image_url?: string | null
  return_image_uploaded_at?: string | null
  created_at: string
  updated_at: string
}

export interface BorrowForm {
  name: string
  phone: string
  equipment_id: string
}

export interface ReturnForm {
  phone: string
}

export interface Setting {
  id: string
  key: string
  value: string
  created_at: string
  updated_at: string
}

export interface CityForm {
  name: string
  manager1_name: string
  manager1_phone: string
  manager2_name?: string
  manager2_phone?: string
  location_url?: string
  token_location_url?: string
  password: string
}

export interface AdminNotification {
  id: string
  city_id: string
  city_name: string
  message: string
  is_read: boolean
  created_at: string
}

// Equipment Request System Interfaces

export interface EquipmentRequest {
  id: string
  city_id: string
  requester_name: string
  requester_phone: string
  call_id?: string | null
  token_hash: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired' | 'picked_up'
  expires_at: string
  approved_by?: string | null
  approved_at?: string | null
  rejected_reason?: string | null
  created_at: string
  updated_at: string
}

export interface RequestItem {
  id: string
  request_id: string
  equipment_id: string
  quantity: number
  created_at: string
}

export interface RequestItemWithEquipment extends RequestItem {
  equipment: Equipment
}

export interface EquipmentRequestWithItems extends EquipmentRequest {
  items: RequestItemWithEquipment[]
  city?: City
}

export interface CreateRequestForm {
  requester_name: string
  requester_phone: string
  call_id?: string
  items: {
    equipment_id: string
    quantity: number
  }[]
}

export interface ActivityLog {
  id: string
  city_id: string
  manager_name: string
  action: string
  details?: Record<string, any>
  ip_address?: string | null
  created_at: string
}

// City Manager Authentication Interfaces
export interface CityManager {
  id: string
  city_id: string
  email: string
  password_hash: string
  role: 'manager1' | 'manager2'
  name: string
  phone: string
  email_verified: boolean
  verification_token?: string | null
  verification_token_expires_at?: string | null
  reset_token?: string | null
  reset_token_expires_at?: string | null
  permissions: {
    can_edit_equipment: boolean
    can_approve_requests: boolean
    can_view_history: boolean
  }
  created_at: string
  updated_at: string
  last_login?: string | null
}

export interface CityManagerWithCity extends CityManager {
  city: City
}

export interface UpdateManagerForm {
  name?: string
  phone?: string
  email?: string
  current_password?: string
  new_password?: string
}

export interface CreateManagerForm {
  city_id: string
  email: string
  role: 'manager1' | 'manager2'
  name: string
  phone: string
  temporary_password: string
}

export interface UserCity {
  id: string
  user_id: string
  city_id: string
  manager_role?: 'manager1' | 'manager2'
  created_at: string
  updated_at: string
  city?: City  // Include city details when needed
}
