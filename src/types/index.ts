export interface Equipment {
  id: string
  name: string
  quantity: number
  created_at: string
  updated_at: string
}

export interface BorrowHistory {
  id: string
  name: string
  phone: string
  equipment_id: string
  equipment_name: string
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
