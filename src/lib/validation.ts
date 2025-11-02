/**
 * Validation utilities for the equipment management system
 */

/**
 * Validates Israeli phone number format
 * Accepts: 05X-XXXXXXX or 05XXXXXXXX
 */
export const validatePhone = (phone: string): boolean => {
  if (!phone) return false
  const cleaned = phone.replace(/[-\s]/g, '')
  const phoneRegex = /^05\d{8}$/
  return phoneRegex.test(cleaned)
}

/**
 * Validates equipment name
 */
export const validateEquipmentName = (name: string): boolean => {
  if (!name) return false
  return name.trim().length >= 2 && name.trim().length <= 100
}

/**
 * Validates quantity (must be non-negative integer)
 */
export const validateQuantity = (quantity: number): boolean => {
  return Number.isInteger(quantity) && quantity >= 0
}

/**
 * Validates user name
 */
export const validateUserName = (name: string): boolean => {
  if (!name) return false
  return name.trim().length >= 2 && name.trim().length <= 50
}

/**
 * Formats phone number to Israeli standard
 */
export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/[-\s]/g, '')
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`
  }
  return phone
}
