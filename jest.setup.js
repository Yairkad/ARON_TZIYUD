import '@testing-library/jest-dom'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local for integration tests
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// Add fetch polyfill for Node.js environment
if (!global.fetch) {
  global.fetch = require('node-fetch')
}

// Fallback to mock values only if real env vars are not set
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'
}
if (!process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
  process.env.NEXT_PUBLIC_ADMIN_PASSWORD = '1234'
}
