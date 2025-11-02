import type { Equipment, BorrowHistory, BorrowForm, ReturnForm } from '@/types'

describe('Type Definitions', () => {
  describe('Equipment', () => {
    it('should match expected structure', () => {
      const equipment: Equipment = {
        id: 'test-id',
        name: 'Test Equipment',
        quantity: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      expect(equipment).toHaveProperty('id')
      expect(equipment).toHaveProperty('name')
      expect(equipment).toHaveProperty('quantity')
      expect(equipment).toHaveProperty('created_at')
      expect(equipment).toHaveProperty('updated_at')
    })
  })

  describe('BorrowHistory', () => {
    it('should match expected structure', () => {
      const borrowHistory: BorrowHistory = {
        id: 'test-id',
        name: 'Test User',
        phone: '0501234567',
        equipment_id: 'equipment-id',
        equipment_name: 'Test Equipment',
        borrow_date: new Date().toISOString(),
        status: 'borrowed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      expect(borrowHistory).toHaveProperty('id')
      expect(borrowHistory).toHaveProperty('name')
      expect(borrowHistory).toHaveProperty('phone')
      expect(borrowHistory).toHaveProperty('equipment_id')
      expect(borrowHistory).toHaveProperty('equipment_name')
      expect(borrowHistory).toHaveProperty('borrow_date')
      expect(borrowHistory).toHaveProperty('status')
    })

    it('should accept borrowed status', () => {
      const status: BorrowHistory['status'] = 'borrowed'
      expect(status).toBe('borrowed')
    })

    it('should accept returned status', () => {
      const status: BorrowHistory['status'] = 'returned'
      expect(status).toBe('returned')
    })
  })

  describe('BorrowForm', () => {
    it('should match expected structure', () => {
      const form: BorrowForm = {
        name: 'Test User',
        phone: '0501234567',
        equipment_id: 'equipment-id',
      }

      expect(form).toHaveProperty('name')
      expect(form).toHaveProperty('phone')
      expect(form).toHaveProperty('equipment_id')
    })
  })

  describe('ReturnForm', () => {
    it('should match expected structure', () => {
      const form: ReturnForm = {
        phone: '0501234567',
      }

      expect(form).toHaveProperty('phone')
      expect(form.phone).toBe('0501234567')
    })
  })
})
