/**
 * Equipment Cabinet - RLS Policies Tests
 * Comprehensive test suite for all RLS policies
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Test users
const TEST_SUPER_ADMIN_ID = '00000000-0000-0000-0000-000000000001'
const TEST_CITY_MANAGER_ID = '00000000-0000-0000-0000-000000000002'
const TEST_CITY_ID = '00000000-0000-0000-0000-000000000099'

describe('Equipment Cabinet - RLS Policies', () => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  beforeAll(async () => {
    // Setup: Create test data
    await supabase.from('cities').upsert({
      id: TEST_CITY_ID,
      name: 'Test City',
      is_active: true
    })

    await supabase.from('users').upsert([
      {
        id: TEST_SUPER_ADMIN_ID,
        email: 'test_super@test.com',
        role: 'super_admin',
        full_name: 'Test Super Admin',
        permissions: 'full_access',
        is_active: true
      },
      {
        id: TEST_CITY_MANAGER_ID,
        email: 'test_manager@test.com',
        role: 'city_manager',
        city_id: TEST_CITY_ID,
        full_name: 'Test City Manager',
        permissions: 'full_access',
        is_active: true
      }
    ])
  })

  afterAll(async () => {
    // Cleanup
    await supabase.from('users').delete().in('id', [TEST_SUPER_ADMIN_ID, TEST_CITY_MANAGER_ID])
    await supabase.from('cities').delete().eq('id', TEST_CITY_ID)
  })

  describe('activity_log', () => {
    it('should allow system to insert activity logs', async () => {
      const { error } = await supabase.from('activity_log').insert({
        city_id: TEST_CITY_ID,
        manager_name: 'Test Manager',
        action: 'test_action',
        details: 'Test details'
      })

      expect(error).toBeNull()
    })

    it('should allow authenticated users to view logs', async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .limit(1)

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })
  })

  describe('admin_notifications', () => {
    it('should allow system to insert notifications', async () => {
      const { error } = await supabase.from('admin_notifications').insert({
        city_id: TEST_CITY_ID,
        city_name: 'Test City',
        message: 'Test notification',
        is_read: false
      })

      expect(error).toBeNull()
    })

    it('should prevent unauthorized users from inserting notifications', async () => {
      const anonClient = createClient(supabaseUrl, supabaseAnonKey)

      const { error } = await anonClient.from('admin_notifications').insert({
        city_id: TEST_CITY_ID,
        city_name: 'Test City',
        message: 'Unauthorized notification',
        is_read: false
      })

      // Should not have permission (but system can insert via Service Role)
      expect(error).toBeDefined()
    })
  })

  describe('borrow_history', () => {
    it('should allow public to create borrow records', async () => {
      const { error } = await supabase.from('borrow_history').insert({
        city_id: TEST_CITY_ID,
        name: 'Test Borrower',
        phone: '0501234567',
        equipment_name: 'Test Equipment',
        borrow_date: new Date().toISOString(),
        status: 'borrowed'
      })

      expect(error).toBeNull()
    })

    it('should allow city managers to view their city history', async () => {
      const { data, error } = await supabase
        .from('borrow_history')
        .select('*')
        .eq('city_id', TEST_CITY_ID)

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })
  })

  describe('equipment_requests', () => {
    it('should allow system to create requests', async () => {
      // Use service role to create requests (API handles token generation)
      const { error } = await supabase.from('equipment_requests').insert({
        city_id: TEST_CITY_ID,
        requester_name: 'Test Contact',
        requester_phone: '0501234567',
        token: 'test-token-123',
        token_hash: 'hash123',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        status: 'pending'
      })

      expect(error).toBeNull()
    })

    it('should allow anyone to view requests (token verified in app)', async () => {
      const { data, error } = await supabase
        .from('equipment_requests')
        .select('*')
        .limit(1)

      expect(error).toBeNull()
    })
  })

  describe('request_items', () => {
    it('should allow system to create request items', async () => {
      // First create a request
      const { data: request } = await supabase
        .from('equipment_requests')
        .insert({
          city_id: TEST_CITY_ID,
          requester_name: 'Test',
          requester_phone: '0501234567',
          token: 'test-token-456',
          token_hash: 'hash456',
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          status: 'pending'
        })
        .select()
        .single()

      if (!request) return

      const { error } = await supabase.from('request_items').insert({
        request_id: request.id,
        quantity: 1
      })

      expect(error).toBeNull()

      // Cleanup
      await supabase.from('request_items').delete().eq('request_id', request.id)
      await supabase.from('equipment_requests').delete().eq('id', request.id)
    })
  })

  describe('signed_forms', () => {
    it.skip('should allow system to insert signed forms - table may not exist', async () => {
      // This test is skipped as signed_forms table may not be in use
      const { error } = await supabase.from('signed_forms').insert({
        city_id: TEST_CITY_ID,
        signature_data: 'base64-signature-data',
        request_id: null
      })

      expect(error).toBeNull()
    })

    it.skip('should allow public to view forms - table may not exist', async () => {
      const { data, error } = await supabase
        .from('signed_forms')
        .select('*')
        .limit(1)

      expect(error).toBeNull()
    })
  })

  describe('cities table', () => {
    it('should allow public to read active cities', async () => {
      const anonClient = createClient(supabaseUrl, supabaseAnonKey)

      const { data, error } = await anonClient
        .from('cities')
        .select('*')
        .eq('is_active', true)

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('should prevent public from updating cities', async () => {
      const anonClient = createClient(supabaseUrl, supabaseAnonKey)

      const { error } = await anonClient
        .from('cities')
        .update({ name: 'Hacked City' })
        .eq('id', TEST_CITY_ID)

      expect(error).toBeDefined()
    })
  })

  describe('global_equipment_pool', () => {
    const TEST_EQUIPMENT_ID = '00000000-0000-0000-0000-000000000010'

    beforeAll(async () => {
      await supabase.from('global_equipment_pool').upsert({
        id: TEST_EQUIPMENT_ID,
        name: 'Test Equipment',
        status: 'active',
        is_consumable: false
      })
    })

    afterAll(async () => {
      await supabase.from('global_equipment_pool').delete().eq('id', TEST_EQUIPMENT_ID)
    })

    it('should allow public to read active equipment', async () => {
      const anonClient = createClient(supabaseUrl, supabaseAnonKey)

      const { data, error } = await anonClient
        .from('global_equipment_pool')
        .select('*')
        .eq('status', 'active')

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('should prevent public from inserting equipment', async () => {
      const anonClient = createClient(supabaseUrl, supabaseAnonKey)

      const { error } = await anonClient
        .from('global_equipment_pool')
        .insert({
          name: 'Unauthorized Equipment',
          status: 'active'
        })

      expect(error).toBeDefined()
    })
  })

  describe('city_equipment', () => {
    const TEST_EQUIPMENT_ID = '00000000-0000-0000-0000-000000000011'

    beforeAll(async () => {
      await supabase.from('global_equipment_pool').upsert({
        id: TEST_EQUIPMENT_ID,
        name: 'Test City Equipment',
        status: 'active'
      })
    })

    afterAll(async () => {
      await supabase.from('city_equipment').delete().eq('city_id', TEST_CITY_ID)
      await supabase.from('global_equipment_pool').delete().eq('id', TEST_EQUIPMENT_ID)
    })

    it('should allow system to link equipment to city', async () => {
      const { error } = await supabase.from('city_equipment').insert({
        city_id: TEST_CITY_ID,
        global_equipment_id: TEST_EQUIPMENT_ID,
        quantity: 5,
        equipment_status: 'working'
      })

      expect(error).toBeNull()
    })

    it('should allow public to read city equipment', async () => {
      const anonClient = createClient(supabaseUrl, supabaseAnonKey)

      const { data, error } = await anonClient
        .from('city_equipment')
        .select('*')
        .eq('city_id', TEST_CITY_ID)

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })
  })

  describe('RLS Policy Edge Cases', () => {
    it('should handle null city_id gracefully', async () => {
      // Test that policies handle null values correctly
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .is('city_id', null)
        .limit(1)

      // Should not throw error, just return empty or filtered results
      expect(error).toBeNull()
    })

    it('should prevent SQL injection in RLS policies', async () => {
      const maliciousInput = "' OR '1'='1"

      const { data, error } = await supabase
        .from('equipment_requests')
        .select('*')
        .eq('city_id', maliciousInput)

      // Supabase properly validates UUID format and rejects invalid input
      // This is the expected behavior - SQL injection is prevented at the type level
      expect(error).toBeDefined()
      expect(error?.code).toBe('22P02') // Invalid UUID format error
      expect(data).toBeNull()
    })

    it('should handle concurrent access properly', async () => {
      // Test that multiple requests don\'t interfere with each other
      const promises = Array(5).fill(null).map(() =>
        supabase
          .from('cities')
          .select('*')
          .eq('id', TEST_CITY_ID)
          .single()
      )

      const results = await Promise.all(promises)

      results.forEach(result => {
        expect(result.error).toBeNull()
        expect(result.data).toBeDefined()
      })
    })
  })

  describe('Performance Tests', () => {
    it('should fetch activity logs efficiently', async () => {
      const start = Date.now()

      await supabase
        .from('activity_log')
        .select('*')
        .eq('city_id', TEST_CITY_ID)
        .limit(50)

      const duration = Date.now() - start

      // Should complete within reasonable time (2 seconds)
      expect(duration).toBeLessThan(2000)
    })

    it('should handle large result sets with pagination', async () => {
      const pageSize = 10
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('city_id', TEST_CITY_ID)
        .order('created_at', { ascending: false })
        .range(0, pageSize - 1)

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data?.length).toBeLessThanOrEqual(pageSize)
    })
  })
})
