export interface City {
  id: string
  name: string
  manager1_name: string
  manager1_phone: string
  manager2_name?: string | null
  manager2_phone?: string | null
  location_url?: string | null
  password: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Equipment {
  id: string
  name: string
  quantity: number
  city_id: string
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
  password: string
}
