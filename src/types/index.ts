export interface City {
  id: string
  name: string
  manager1_name: string
  manager1_phone: string
  manager2_name?: string | null
  manager2_phone?: string | null
  location_url?: string | null
  token_location_url?: string | null
  location_description?: string | null
  location_image_url?: string | null
  password: string
  is_active: boolean
  request_mode?: 'direct' | 'request'
  cabinet_code?: string | null
  require_call_id?: boolean
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
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired'
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
