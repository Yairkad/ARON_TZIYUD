/**
 * Equipment Cabinet - Integration Workflow Tests
 * End-to-end tests for complete borrowing workflows
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Test data
const TEST_CITY_ID = '00000000-0000-0000-0000-000000000099'
const TEST_EQUIPMENT_ID = '00000000-0000-0000-0000-000000000003'
const TEST_CATEGORY_ID = '00000000-0000-0000-0000-000000000050'

describe('Equipment Cabinet - Integration Workflows', () => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  beforeAll(async () => {
    // Setup complete test environment
    await supabase.from('cities').upsert({
      id: TEST_CITY_ID,
      name: 'Integration Test City',
      is_active: true,
      request_mode: 'request',
      require_call_id: false,
      max_request_distance_km: null // No distance limit for tests
    })

    await supabase.from('equipment_categories').upsert({
      id: TEST_CATEGORY_ID,
      name: 'Test Category',
      display_order: 1
    })

    await supabase.from('global_equipment_pool').upsert({
      id: TEST_EQUIPMENT_ID,
      name: 'Test Integration Equipment',
      status: 'active',
      is_consumable: false,
      category_id: TEST_CATEGORY_ID
    })

    await supabase.from('city_equipment').upsert({
      city_id: TEST_CITY_ID,
      global_equipment_id: TEST_EQUIPMENT_ID,
      quantity: 10,
      equipment_status: 'working',
      is_consumable: false
    })
  })

  afterAll(async () => {
    // Comprehensive cleanup
    await supabase.from('borrow_history').delete().eq('city_id', TEST_CITY_ID)
    await supabase.from('request_items').delete().match({ global_equipment_id: TEST_EQUIPMENT_ID })
    await supabase.from('equipment_requests').delete().eq('city_id', TEST_CITY_ID)
    await supabase.from('city_equipment').delete().eq('city_id', TEST_CITY_ID)
    await supabase.from('global_equipment_pool').delete().eq('id', TEST_EQUIPMENT_ID)
    await supabase.from('equipment_categories').delete().eq('id', TEST_CATEGORY_ID)
    await supabase.from('activity_log').delete().eq('city_id', TEST_CITY_ID)
    await supabase.from('cities').delete().eq('id', TEST_CITY_ID)
  })

  describe('Complete Request-to-Borrow Workflow', () => {
    let requestToken: string
    let requestId: string

    it('Step 1: User creates equipment request', async () => {
      const response = await fetch(`${APP_URL}/api/requests/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city_id: TEST_CITY_ID,
          requester_name: 'Integration Test User',
          requester_phone: '0501112233',
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

      requestToken = data.token
      requestId = data.requestId
    })

    it('Step 2: User verifies token is valid', async () => {
      const response = await fetch(`${APP_URL}/api/requests/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: requestToken
        })
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.valid).toBe(true)
      expect(data.request.status).toBe('pending')
    })

    it('Step 3: Manager approves request', async () => {
      // Simulate manager approval
      const { error } = await supabase
        .from('equipment_requests')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId)

      expect(error).toBeNull()
    })

    it('Step 4: User confirms pickup with signature', async () => {
      const response = await fetch(`${APP_URL}/api/requests/confirm-pickup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: requestToken,
          signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        })
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.borrowHistory).toBeDefined()
    })

    it('Step 5: Verify borrow history was created', async () => {
      const { data: borrowHistory, error } = await supabase
        .from('borrow_history')
        .select('*')
        .eq('city_id', TEST_CITY_ID)
        .eq('borrower_phone', '0501112233')
        .eq('status', 'borrowed')

      expect(error).toBeNull()
      expect(borrowHistory).toBeDefined()
      expect(borrowHistory?.length).toBeGreaterThan(0)
    })

    it('Step 6: Verify signed form was created', async () => {
      const { data: signedForms, error } = await supabase
        .from('signed_forms')
        .select('*')
        .eq('city_id', TEST_CITY_ID)
        .eq('borrower_name', 'Integration Test User')

      expect(error).toBeNull()
      expect(signedForms).toBeDefined()
      expect(signedForms?.length).toBeGreaterThan(0)
    })

    it('Step 7: Verify request status changed to completed', async () => {
      const { data: request, error } = await supabase
        .from('equipment_requests')
        .select('status')
        .eq('id', requestId)
        .single()

      expect(error).toBeNull()
      expect(request?.status).toBe('completed')
    })
  })

  describe('Overdue Equipment Detection Workflow', () => {
    it('should detect overdue equipment after 24 hours', async () => {
      // Create a borrow record from 25 hours ago
      const overdueDate = new Date()
      overdueDate.setHours(overdueDate.getHours() - 25)

      const { data: borrowRecord } = await supabase
        .from('borrow_history')
        .insert({
          city_id: TEST_CITY_ID,
          borrower_name: 'Overdue Test User',
          borrower_phone: '0502223344',
          equipment_name: 'Test Equipment',
          borrow_date: overdueDate.toISOString(),
          status: 'borrowed'
        })
        .select()
        .single()

      // Check overdue status
      const response = await fetch(`${APP_URL}/api/borrower/check-overdue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '0502223344'
        })
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.hasOverdue).toBe(true)
      expect(data.overdueItems).toBeDefined()
      expect(data.overdueItems.length).toBeGreaterThan(0)

      // Cleanup
      if (borrowRecord) {
        await supabase.from('borrow_history').delete().eq('id', borrowRecord.id)
      }
    })
  })

  describe('Equipment Return Workflow', () => {
    let borrowId: string

    beforeAll(async () => {
      // Create borrow record for return test
      const { data: borrowRecord } = await supabase
        .from('borrow_history')
        .insert({
          city_id: TEST_CITY_ID,
          borrower_name: 'Return Test User',
          borrower_phone: '0503334455',
          equipment_name: 'Test Equipment',
          borrow_date: new Date().toISOString(),
          status: 'borrowed'
        })
        .select()
        .single()

      borrowId = borrowRecord?.id
    })

    it('should process equipment return', async () => {
      const { error } = await supabase
        .from('borrow_history')
        .update({
          status: 'returned',
          return_date: new Date().toISOString()
        })
        .eq('id', borrowId)

      expect(error).toBeNull()
    })

    it('should verify return was recorded', async () => {
      const { data: borrowRecord, error } = await supabase
        .from('borrow_history')
        .select('*')
        .eq('id', borrowId)
        .single()

      expect(error).toBeNull()
      expect(borrowRecord?.status).toBe('returned')
      expect(borrowRecord?.return_date).toBeDefined()
    })
  })

  describe('Multiple Equipment Request Workflow', () => {
    it('should handle request with multiple items', async () => {
      // Create second equipment item
      const SECOND_EQUIPMENT_ID = '00000000-0000-0000-0000-000000000004'

      await supabase.from('global_equipment_pool').upsert({
        id: SECOND_EQUIPMENT_ID,
        name: 'Second Test Equipment',
        status: 'active',
        is_consumable: false
      })

      await supabase.from('city_equipment').upsert({
        city_id: TEST_CITY_ID,
        global_equipment_id: SECOND_EQUIPMENT_ID,
        quantity: 5,
        equipment_status: 'working'
      })

      const response = await fetch(`${APP_URL}/api/requests/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city_id: TEST_CITY_ID,
          requester_name: 'Multi-Item Test User',
          requester_phone: '0504445566',
          items: [
            {
              equipment_id: TEST_EQUIPMENT_ID,
              quantity: 1
            },
            {
              equipment_id: SECOND_EQUIPMENT_ID,
              quantity: 1
            }
          ]
        })
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify request items were created
      const { data: requestItems } = await supabase
        .from('request_items')
        .select('*')
        .eq('request_id', data.requestId)

      expect(requestItems?.length).toBe(2)

      // Cleanup
      await supabase.from('request_items').delete().eq('request_id', data.requestId)
      await supabase.from('equipment_requests').delete().eq('id', data.requestId)
      await supabase.from('city_equipment').delete().eq('global_equipment_id', SECOND_EQUIPMENT_ID)
      await supabase.from('global_equipment_pool').delete().eq('id', SECOND_EQUIPMENT_ID)
    })
  })

  describe('Activity Logging Throughout Workflow', () => {
    it('should log all major actions', async () => {
      const { logActivity, ActivityActions } = await import('@/lib/activity-logger')

      // Log various actions
      await logActivity({
        cityId: TEST_CITY_ID,
        managerName: 'Test Manager',
        action: ActivityActions.BORROW_APPROVED,
        details: { equipment: 'Test Equipment' }
      })

      await logActivity({
        cityId: TEST_CITY_ID,
        managerName: 'Test Manager',
        action: ActivityActions.RETURN_PROCESSED,
        details: { equipment: 'Test Equipment' }
      })

      // Verify logs were created
      const { data: logs, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('city_id', TEST_CITY_ID)
        .order('created_at', { ascending: false })
        .limit(10)

      expect(error).toBeNull()
      expect(logs).toBeDefined()
      expect(logs?.length).toBeGreaterThan(0)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle duplicate request gracefully', async () => {
      const requestData = {
        city_id: TEST_CITY_ID,
        requester_name: 'Duplicate Test',
        requester_phone: '0505556677',
        items: [
          {
            equipment_id: TEST_EQUIPMENT_ID,
            quantity: 1
          }
        ]
      }

      // Create first request
      const response1 = await fetch(`${APP_URL}/api/requests/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      expect(response1.status).toBe(200)

      // Try to create another request immediately
      const response2 = await fetch(`${APP_URL}/api/requests/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      // Should succeed - system allows multiple requests
      expect(response2.status).toBe(200)

      // Cleanup
      const data1 = await response1.json()
      const data2 = await response2.json()
      await supabase.from('request_items').delete().in('request_id', [data1.requestId, data2.requestId])
      await supabase.from('equipment_requests').delete().in('id', [data1.requestId, data2.requestId])
    })

    it('should handle equipment out of stock', async () => {
      // Create equipment with 0 quantity
      const OUT_OF_STOCK_ID = '00000000-0000-0000-0000-000000000005'

      await supabase.from('global_equipment_pool').upsert({
        id: OUT_OF_STOCK_ID,
        name: 'Out of Stock Equipment',
        status: 'active'
      })

      await supabase.from('city_equipment').upsert({
        city_id: TEST_CITY_ID,
        global_equipment_id: OUT_OF_STOCK_ID,
        quantity: 0,
        equipment_status: 'working'
      })

      const response = await fetch(`${APP_URL}/api/requests/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city_id: TEST_CITY_ID,
          requester_name: 'Out of Stock Test',
          requester_phone: '0506667788',
          items: [
            {
              equipment_id: OUT_OF_STOCK_ID,
              quantity: 1
            }
          ]
        })
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('אינו זמין')

      // Cleanup
      await supabase.from('city_equipment').delete().eq('global_equipment_id', OUT_OF_STOCK_ID)
      await supabase.from('global_equipment_pool').delete().eq('id', OUT_OF_STOCK_ID)
    })
  })
})
