import {
  validatePhone,
  validateEquipmentName,
  validateQuantity,
  validateUserName,
  formatPhone,
} from '@/lib/validation'

describe('Validation Functions', () => {
  describe('validatePhone', () => {
    it('should accept valid Israeli phone numbers', () => {
      expect(validatePhone('0501234567')).toBe(true)
      expect(validatePhone('0521234567')).toBe(true)
      expect(validatePhone('0531234567')).toBe(true)
      expect(validatePhone('0541234567')).toBe(true)
      expect(validatePhone('0551234567')).toBe(true)
    })

    it('should accept phone numbers with dashes', () => {
      expect(validatePhone('050-1234567')).toBe(true)
      expect(validatePhone('052-1234567')).toBe(true)
    })

    it('should accept phone numbers with spaces', () => {
      expect(validatePhone('050 1234567')).toBe(true)
      expect(validatePhone('052 123 4567')).toBe(true)
    })

    it('should reject invalid phone numbers', () => {
      expect(validatePhone('123456789')).toBe(false)
      expect(validatePhone('04-1234567')).toBe(false)
      expect(validatePhone('050-123456')).toBe(false) // too short
      expect(validatePhone('050-12345678')).toBe(false) // too long
      expect(validatePhone('')).toBe(false)
      expect(validatePhone('abc')).toBe(false)
    })

    it('should reject phone numbers not starting with 05', () => {
      expect(validatePhone('0201234567')).toBe(false)
      expect(validatePhone('0301234567')).toBe(false)
    })
  })

  describe('validateEquipmentName', () => {
    it('should accept valid equipment names', () => {
      expect(validateEquipmentName('פנס ראש')).toBe(true)
      expect(validateEquipmentName('אוהל')).toBe(true)
      expect(validateEquipmentName('Tent')).toBe(true)
      expect(validateEquipmentName('Equipment 123')).toBe(true)
    })

    it('should reject names that are too short', () => {
      expect(validateEquipmentName('a')).toBe(false)
      expect(validateEquipmentName(' ')).toBe(false)
    })

    it('should reject names that are too long', () => {
      const longName = 'a'.repeat(101)
      expect(validateEquipmentName(longName)).toBe(false)
    })

    it('should reject empty names', () => {
      expect(validateEquipmentName('')).toBe(false)
      expect(validateEquipmentName('   ')).toBe(false)
    })

    it('should trim whitespace when validating', () => {
      expect(validateEquipmentName('  פנס  ')).toBe(true)
      expect(validateEquipmentName('  ab  ')).toBe(true)
    })
  })

  describe('validateQuantity', () => {
    it('should accept valid quantities', () => {
      expect(validateQuantity(0)).toBe(true)
      expect(validateQuantity(1)).toBe(true)
      expect(validateQuantity(100)).toBe(true)
      expect(validateQuantity(9999)).toBe(true)
    })

    it('should reject negative quantities', () => {
      expect(validateQuantity(-1)).toBe(false)
      expect(validateQuantity(-100)).toBe(false)
    })

    it('should reject non-integer quantities', () => {
      expect(validateQuantity(1.5)).toBe(false)
      expect(validateQuantity(0.1)).toBe(false)
      expect(validateQuantity(99.99)).toBe(false)
    })

    it('should reject NaN', () => {
      expect(validateQuantity(NaN)).toBe(false)
    })
  })

  describe('validateUserName', () => {
    it('should accept valid user names', () => {
      expect(validateUserName('יוסי כהן')).toBe(true)
      expect(validateUserName('John Doe')).toBe(true)
      expect(validateUserName('משה')).toBe(true)
      expect(validateUserName('Ab')).toBe(true)
    })

    it('should reject names that are too short', () => {
      expect(validateUserName('a')).toBe(false)
      expect(validateUserName(' ')).toBe(false)
    })

    it('should reject names that are too long', () => {
      const longName = 'a'.repeat(51)
      expect(validateUserName(longName)).toBe(false)
    })

    it('should reject empty names', () => {
      expect(validateUserName('')).toBe(false)
      expect(validateUserName('   ')).toBe(false)
    })

    it('should trim whitespace when validating', () => {
      expect(validateUserName('  משה  ')).toBe(true)
      expect(validateUserName('  John Doe  ')).toBe(true)
    })
  })

  describe('formatPhone', () => {
    it('should format 10-digit phone numbers', () => {
      expect(formatPhone('0501234567')).toBe('050-1234567')
      expect(formatPhone('0521234567')).toBe('052-1234567')
    })

    it('should remove existing formatting and reformat', () => {
      expect(formatPhone('050-123-4567')).toBe('050-1234567')
      expect(formatPhone('050 123 4567')).toBe('050-1234567')
    })

    it('should return original if not 10 digits', () => {
      expect(formatPhone('123')).toBe('123')
      expect(formatPhone('05012345678')).toBe('05012345678')
    })

    it('should handle empty string', () => {
      expect(formatPhone('')).toBe('')
    })
  })
})
