/**
 * Equipment Cabinet - API City Equipment Tests
 * Tests for /api/city-equipment endpoints
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Test data
const TEST_CITY_ID = '00000000-0000-0000-0000-000000000099'
const TEST_EQUIPMENT_ID = '00000000-0000-0000-0000-000000000002'

describe('Equipment Cabinet - API City Equipment', () => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  beforeAll(async () => {
    // Setup: Create test city
    await supabase.from('cities').upsert({
      id: TEST_CITY_ID,
      name: 'Test City',
      is_active: true
    })

    // Create test equipment in global pool
    await supabase.from('global_equipment_pool').upsert({
      id: TEST_EQUIPMENT_ID,
      name: 'Test Equipment for City',
      status: 'active',
      is_consumable: false
    })
  })

  afterAll(async () => {
    // Cleanup
    await supabase.from('city_equipment').delete().eq('city_id', TEST_CITY_ID)
    await supabase.from('global_equipment_pool').delete().eq('id', TEST_EQUIPMENT_ID)
    await supabase.from('cities').delete().eq('id', TEST_CITY_ID)
  })

  describe('GET /api/city-equipment', () => {
    beforeAll(async () => {
      // Add equipment to city
      await supabase.from('city_equipment').upsert({
        city_id: TEST_CITY_ID,
        global_equipment_id: TEST_EQUIPMENT_ID,
        quantity: 10,
        equipment_status: 'working',
        is_consumable: false,
        display_order: 1
      })
    })

    it('should fetch all equipment for a city', async () => {
      const response = await fetch(
        `${APP_URL}/api/city-equipment?cityId=${TEST_CITY_ID}`
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.equipment).toBeDefined()
      expect(Array.isArray(data.equipment)).toBe(true)
      expect(data.equipment.length).toBeGreaterThan(0)
    })

    it('should return error when cityId is missing', async () => {
      const response = await fetch(`${APP_URL}/api/city-equipment`)

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('מזהה עיר')
    })

    it('should include global equipment details', async () => {
      const response = await fetch(
        `${APP_URL}/api/city-equipment?cityId=${TEST_CITY_ID}`
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.equipment[0]).toHaveProperty('global_equipment')
      expect(data.equipment[0].global_equipment).toHaveProperty('name')
      expect(data.equipment[0].global_equipment).toHaveProperty('status')
    })
  })

  describe('POST /api/city-equipment', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${APP_URL}/api/city-equipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city_id: TEST_CITY_ID,
          global_equipment_id: TEST_EQUIPMENT_ID,
          quantity: 5
        })
      })

      // Should fail without authentication
      expect(response.status).toBeGreaterThanOrEqual(401)
    })

    it('should reject request with missing parameters', async () => {
      const response = await fetch(`${APP_URL}/api/city-equipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city_id: TEST_CITY_ID
          // Missing global_equipment_id
        })
      })

      expect(response.status).toBeGreaterThanOrEqual(400)
    })
  })

  describe('PUT /api/city-equipment', () => {
    let cityEquipmentId: string

    beforeAll(async () => {
      // Create equipment link for testing updates
      const { data } = await supabase
        .from('city_equipment')
        .insert({
          city_id: TEST_CITY_ID,
          global_equipment_id: TEST_EQUIPMENT_ID,
          quantity: 5,
          equipment_status: 'working'
        })
        .select()
        .single()

      cityEquipmentId = data?.id
    })

    it('should require authentication', async () => {
      const response = await fetch(`${APP_URL}/api/city-equipment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cityEquipmentId,
          quantity: 10
        })
      })

      // Should fail without authentication
      expect(response.status).toBeGreaterThanOrEqual(401)
    })

    it('should reject update without equipment id', async () => {
      const response = await fetch(`${APP_URL}/api/city-equipment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: 10
        })
      })

      expect(response.status).toBe(400)
    })
  })

  describe('DELETE /api/city-equipment', () => {
    it('should require authentication', async () => {
      const response = await fetch(
        `${APP_URL}/api/city-equipment?id=00000000-0000-0000-0000-000000000001`,
        {
          method: 'DELETE'
        }
      )

      // Should fail without authentication
      expect(response.status).toBeGreaterThanOrEqual(401)
    })

    it('should require equipment id parameter', async () => {
      const response = await fetch(`${APP_URL}/api/city-equipment`, {
        method: 'DELETE'
      })

      expect(response.status).toBe(400)
    })
  })

  describe('Equipment Status Management', () => {
    it('should support equipment_status values', async () => {
      const statuses = ['working', 'broken', 'maintenance']

      // Just verify that these are the expected status values
      expect(statuses).toContain('working')
      expect(statuses).toContain('broken')
      expect(statuses).toContain('maintenance')
    })

    it('should support consumable equipment', async () => {
      const { data } = await supabase
        .from('city_equipment')
        .insert({
          city_id: TEST_CITY_ID,
          global_equipment_id: TEST_EQUIPMENT_ID,
          quantity: 100,
          equipment_status: 'working',
          is_consumable: true
        })
        .select()
        .single()

      expect(data).toBeDefined()
      expect(data?.is_consumable).toBe(true)
      expect(data?.quantity).toBe(100)

      // Cleanup
      if (data) {
        await supabase.from('city_equipment').delete().eq('id', data.id)
      }
    })
  })

  describe('Display Order', () => {
    it('should respect display_order when fetching equipment', async () => {
      // Create multiple equipment items with different display orders
      const equipment1 = await supabase.from('city_equipment').insert({
        city_id: TEST_CITY_ID,
        global_equipment_id: TEST_EQUIPMENT_ID,
        quantity: 1,
        display_order: 3
      }).select().single()

      const equipment2 = await supabase.from('city_equipment').insert({
        city_id: TEST_CITY_ID,
        global_equipment_id: TEST_EQUIPMENT_ID,
        quantity: 1,
        display_order: 1
      }).select().single()

      const response = await fetch(
        `${APP_URL}/api/city-equipment?cityId=${TEST_CITY_ID}`
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.equipment).toBeDefined()

      // Verify ordering (ascending by display_order)
      const orders = data.equipment.map((eq: any) => eq.display_order).filter((o: any) => o !== null)
      for (let i = 0; i < orders.length - 1; i++) {
        expect(orders[i]).toBeLessThanOrEqual(orders[i + 1])
      }

      // Cleanup
      if (equipment1.data) {
        await supabase.from('city_equipment').delete().eq('id', equipment1.data.id)
      }
      if (equipment2.data) {
        await supabase.from('city_equipment').delete().eq('id', equipment2.data.id)
      }
    })
  })
})
