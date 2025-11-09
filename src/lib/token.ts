import crypto from 'crypto'

/**
 * Token Management Utility
 * Handles secure token generation, hashing, and validation for equipment requests
 */

const TOKEN_LENGTH = 32 // 32 bytes = 256 bits of entropy
const TOKEN_EXPIRY_MINUTES = 30

/**
 * Generates a cryptographically secure random token
 * @returns A URL-safe base64 encoded token string
 */
export function generateToken(): string {
  const buffer = crypto.randomBytes(TOKEN_LENGTH)
  // Use URL-safe base64 encoding (replace +/ with -_ and remove padding)
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Hashes a token using SHA-256
 * @param token The plain token to hash
 * @returns The hex-encoded hash of the token
 */
export function hashToken(token: string): string {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex')
}

/**
 * Verifies if a token matches a stored hash
 * @param token The plain token to verify
 * @param hash The stored hash to compare against
 * @returns True if token matches, false otherwise
 */
export function verifyToken(token: string, hash: string): boolean {
  const tokenHash = hashToken(token)
  return crypto.timingSafeEqual(
    Buffer.from(tokenHash, 'hex'),
    Buffer.from(hash, 'hex')
  )
}

/**
 * Calculates expiration timestamp for a token
 * @param minutes Number of minutes until expiration (default: 30)
 * @returns ISO timestamp for expiration
 */
export function getTokenExpiry(minutes: number = TOKEN_EXPIRY_MINUTES): string {
  const expiryDate = new Date()
  expiryDate.setMinutes(expiryDate.getMinutes() + minutes)
  return expiryDate.toISOString()
}

/**
 * Checks if a token has expired
 * @param expiryTimestamp ISO timestamp of token expiration
 * @returns True if expired, false otherwise
 */
export function isTokenExpired(expiryTimestamp: string): boolean {
  return new Date(expiryTimestamp) < new Date()
}

/**
 * Generates a complete token package for a new request
 * @returns Object containing the plain token, its hash, and expiry timestamp
 */
export function createRequestToken() {
  const token = generateToken()
  const tokenHash = hashToken(token)
  const expiresAt = getTokenExpiry()

  return {
    token,        // Send this to the user (via WhatsApp/copy link)
    tokenHash,    // Store this in the database
    expiresAt     // Store this in the database
  }
}
