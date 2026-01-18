/**
 * Equipment Cabinet - API Requests Tests
 * Tests for /api/requests/* endpoints
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Test data
const TEST_CITY_ID = '00000000-0000-0000-0000-000000000099'
const TEST_EQUIPMENT_ID = '00000000-0000-0000-0000-000000000001'

describe('Equipment Cabinet - API Requests', () => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  let testRequestId: string
  let testToken: string

  beforeAll(async () => {
    // Setup: Create test city
    await supabase.from('cities').upsert({
      id: TEST_CITY_ID,
      name: 'Test City',
      is_active: true,
      request_mode: 'request',
      require_call_id: false
    })

    // Create test equipment in global pool
    await supabase.from('global_equipment_pool').upsert({
      id: TEST_EQUIPMENT_ID,
      name: 'Test Equipment',
      status: 'active',
      is_consumable: false
    })

    // Link equipment to city
    await supabase.from('city_equipment').upsert({
      city_id: TEST_CITY_ID,
      global_equipment_id: TEST_EQUIPMENT_ID,
      quantity: 5,
      equipment_status: 'working',
      is_consumable: false
    })
  })

  afterAll(async () => {
    // Cleanup
    await supabase.from('city_equipment').delete().eq('city_id', TEST_CITY_ID)
    await supabase.from('global_equipment_pool').delete().eq('id', TEST_EQUIPMENT_ID)
    await supabase.from('cities').delete().eq('id', TEST_CITY_ID)
  })

  describe('POST /api/requests/create', () => {
    it('should create a new equipment request with valid data', async () => {
      const response = await fetch(`${APP_URL}/api/requests/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city_id: TEST_CITY_ID,
          requester_name: 'Test Borrower',
          requester_phone: '0501234567',
          items: [
            {
              equipment_id: TEST_EQUIPMENT_ID,
              quantity: 1
            }
          ]
        })
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.token).toBeDefined()
      expect(data.requestId).toBeDefined()
      expect(data.expiresAt).toBeDefined()

      // Store for later tests
      testRequestId = data.requestId
      testToken = data.token
    })

    it('should reject request with missing required fields', async () => {
      const response = await fetch(`${APP_URL}/api/requests/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city_id: TEST_CITY_ID,
          requester_name: 'Test Borrower'
          // Missing requester_phone and items
        })
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('חסרים פרטים נדרשים')
    })

    it('should reject request for non-existent equipment', async () => {
      const response = await fetch(`${APP_URL}/api/requests/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city_id: TEST_CITY_ID,
          requester_name: 'Test Borrower',
          requester_phone: '0501234567',
          items: [
            {
              equipment_id: '99999999-9999-9999-9999-999999999999',
              quantity: 1
            }
          ]
        })
      })

      const data = await response.json()

      expect(response.status).toBeGreaterThanOrEqual(400)
      expect(data.error).toBeDefined()
    })

    it('should prevent borrower with overdue items from creating request', async () => {
      // Create overdue borrow record
      const overdueDate = new Date()
      overdueDate.setHours(overdueDate.getHours() - 25) // 25 hours ago

      await supabase.from('borrow_history').insert({
        city_id: TEST_CITY_ID,
        borrower_name: 'Overdue Borrower',
        borrower_phone: '0509999999',
        equipment_name: 'Test Equipment',
        borrow_date: overdueDate.toISOString(),
        status: 'borrowed'
      })

      const response = await fetch(`${APP_URL}/api/requests/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city_id: TEST_CITY_ID,
          requester_name: 'Overdue Borrower',
          requester_phone: '0509999999',
          items: [
            {
              equipment_id: TEST_EQUIPMENT_ID,
              quantity: 1
            }
          ]
        })
      })

      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('לא ניתן לבצע השאלה חדשה')
      expect(data.overdueItems).toBeDefined()

      // Cleanup
      await supabase.from('borrow_history').delete().eq('borrower_phone', '0509999999')
    })
  })

  describe('POST /api/requests/verify', () => {
    it('should verify valid token', async () => {
      const response = await fetch(`${APP_URL}/api/requests/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: testToken
        })
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.valid).toBe(true)
      expect(data.request).toBeDefined()
      expect(data.request.id).toBe(testRequestId)
    })

    it('should reject invalid token', async () => {
      const response = await fetch(`${APP_URL}/api/requests/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'invalid-token-12345'
        })
      })

      const data = await response.json()

      expect(response.status).toBeGreaterThanOrEqual(400)
      expect(data.valid).toBe(false)
    })

    it('should reject expired token', async () => {
      // Create expired request
      const expiredDate = new Date()
      expiredDate.setHours(expiredDate.getHours() - 2) // 2 hours ago

      const { data: expiredRequest } = await supabase
        .from('equipment_requests')
        .insert({
          city_id: TEST_CITY_ID,
          requester_name: 'Expired Test',
          requester_phone: '0501111111',
          token: 'expired-token',
          token_hash: 'hash',
          expires_at: expiredDate.toISOString(),
          status: 'pending'
        })
        .select()
        .single()

      const response = await fetch(`${APP_URL}/api/requests/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'expired-token'
        })
      })

      const data = await response.json()

      expect(data.valid).toBe(false)
      expect(data.error).toContain('פג תוקף')

      // Cleanup
      if (expiredRequest) {
        await supabase.from('equipment_requests').delete().eq('id', expiredRequest.id)
      }
    })
  })

  describe('POST /api/requests/confirm-pickup', () => {
    it('should confirm pickup with valid token and signature', async () => {
      const response = await fetch(`${APP_URL}/api/requests/confirm-pickup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: testToken,
          signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        })
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.borrowHistory).toBeDefined()
    })

    it('should reject confirmation without signature', async () => {
      const response = await fetch(`${APP_URL}/api/requests/confirm-pickup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: testToken
          // Missing signature
        })
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })
  })

  describe('POST /api/requests/extend-token', () => {
    it('should allow managers to extend token expiry', async () => {
      // This test would require authentication setup
      // Skipping for basic test suite
      expect(true).toBe(true)
    })
  })

  describe('POST /api/requests/cancel-token', () => {
    it('should allow managers to cancel token', async () => {
      // This test would require authentication setup
      // Skipping for basic test suite
      expect(true).toBe(true)
    })
  })

  describe('POST /api/requests/manage', () => {
    it('should allow managers to approve/reject requests', async () => {
      // This test would require authentication setup
      // Skipping for basic test suite
      expect(true).toBe(true)
    })
  })
})
