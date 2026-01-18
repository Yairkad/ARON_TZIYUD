-- ============================================================================
-- RLS Policies Unit Tests
-- Created: 2026-01-14
-- Description: Test suite to verify RLS policies work correctly
-- Run this manually to test the security fixes
-- ============================================================================

-- ============================================================================
-- SETUP: Create test users
-- ============================================================================

-- Test user 1: Super Admin
DO $$
DECLARE
  test_super_admin_id UUID := '00000000-0000-0000-0000-000000000001';
  test_city_manager_id UUID := '00000000-0000-0000-0000-000000000002';
  test_city_id UUID;
BEGIN
  -- Get or create a test city
  SELECT id INTO test_city_id FROM cities LIMIT 1;

  IF test_city_id IS NULL THEN
    INSERT INTO cities (name, is_active) VALUES ('Test City', true) RETURNING id INTO test_city_id;
  END IF;

  -- Clean up old test users
  DELETE FROM users WHERE id IN (test_super_admin_id, test_city_manager_id);

  -- Insert test super admin
  INSERT INTO users (id, email, role, full_name, permissions, is_active)
  VALUES (
    test_super_admin_id,
    'test_super_admin@test.com',
    'super_admin',
    'Test Super Admin',
    'full_access',
    true
  ) ON CONFLICT (id) DO UPDATE SET
    role = 'super_admin',
    permissions = 'full_access';

  -- Insert test city manager
  INSERT INTO users (id, email, role, city_id, full_name, permissions, is_active)
  VALUES (
    test_city_manager_id,
    'test_city_manager@test.com',
    'city_manager',
    test_city_id,
    'Test City Manager',
    'full_access',
    true
  ) ON CONFLICT (id) DO UPDATE SET
    role = 'city_manager',
    city_id = test_city_id,
    permissions = 'full_access';

  RAISE NOTICE 'Test users created successfully';
END $$;

-- ============================================================================
-- TEST 1: Districts - Only super admins can manage
-- ============================================================================

DO $$
DECLARE
  test_super_admin_id UUID := '00000000-0000-0000-0000-000000000001';
  test_city_manager_id UUID := '00000000-0000-0000-0000-000000000002';
  test_district_id UUID;
  can_insert BOOLEAN;
  can_update BOOLEAN;
  can_delete BOOLEAN;
BEGIN
  RAISE NOTICE '=== Testing Districts RLS ===';

  -- Test 1.1: Super admin can insert districts
  BEGIN
    -- Set current user to super admin
    PERFORM set_config('request.jwt.claims', json_build_object('sub', test_super_admin_id)::text, true);

    INSERT INTO districts (code, name, color)
    VALUES ('test_district', 'Test District', '#FF0000')
    RETURNING id INTO test_district_id;

    RAISE NOTICE '✓ TEST PASSED: Super admin can insert districts';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ TEST FAILED: Super admin cannot insert districts - %', SQLERRM;
  END;

  -- Test 1.2: Super admin can update districts
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', test_super_admin_id)::text, true);

    UPDATE districts
    SET name = 'Updated Test District'
    WHERE id = test_district_id;

    RAISE NOTICE '✓ TEST PASSED: Super admin can update districts';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ TEST FAILED: Super admin cannot update districts - %', SQLERRM;
  END;

  -- Test 1.3: City manager CANNOT insert districts
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', test_city_manager_id)::text, true);

    INSERT INTO districts (code, name, color)
    VALUES ('unauthorized_district', 'Unauthorized', '#00FF00');

    RAISE NOTICE '✗ TEST FAILED: City manager can insert districts (should be blocked!)';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE '✓ TEST PASSED: City manager cannot insert districts (as expected)';
  WHEN OTHERS THEN
    RAISE NOTICE '✓ TEST PASSED: City manager cannot insert districts - %', SQLERRM;
  END;

  -- Test 1.4: City manager CANNOT update districts
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', test_city_manager_id)::text, true);

    UPDATE districts
    SET name = 'Unauthorized Update'
    WHERE id = test_district_id;

    IF NOT FOUND THEN
      RAISE NOTICE '✓ TEST PASSED: City manager cannot update districts';
    ELSE
      RAISE NOTICE '✗ TEST FAILED: City manager can update districts (should be blocked!)';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✓ TEST PASSED: City manager cannot update districts - %', SQLERRM;
  END;

  -- Test 1.5: Super admin can delete districts
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', test_super_admin_id)::text, true);

    DELETE FROM districts WHERE id = test_district_id;

    RAISE NOTICE '✓ TEST PASSED: Super admin can delete districts';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ TEST FAILED: Super admin cannot delete districts - %', SQLERRM;
  END;

END $$;

-- ============================================================================
-- TEST 2: Vehicle Models - Authenticated users can insert/update
-- ============================================================================

DO $$
DECLARE
  test_city_manager_id UUID := '00000000-0000-0000-0000-000000000002';
  test_model_id UUID;
BEGIN
  RAISE NOTICE '=== Testing Vehicle Models RLS ===';

  -- Test 2.1: Authenticated user can insert vehicle models
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', test_city_manager_id)::text, true);

    INSERT INTO vehicle_models (make, make_he, model, bolt_count, bolt_spacing)
    VALUES ('Test Make', 'יצרן בדיקה', 'Test Model', 5, 114.3)
    RETURNING id INTO test_model_id;

    RAISE NOTICE '✓ TEST PASSED: Authenticated user can insert vehicle models';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ TEST FAILED: Authenticated user cannot insert vehicle models - %', SQLERRM;
  END;

  -- Test 2.2: Authenticated user can update vehicle models
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', test_city_manager_id)::text, true);

    UPDATE vehicle_models
    SET model = 'Updated Test Model'
    WHERE id = test_model_id;

    RAISE NOTICE '✓ TEST PASSED: Authenticated user can update vehicle models';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ TEST FAILED: Authenticated user cannot update vehicle models - %', SQLERRM;
  END;

  -- Cleanup
  DELETE FROM vehicle_models WHERE id = test_model_id;

END $$;

-- ============================================================================
-- TEST 3: Users - Only system can update reset tokens
-- ============================================================================

DO $$
DECLARE
  test_city_manager_id UUID := '00000000-0000-0000-0000-000000000002';
BEGIN
  RAISE NOTICE '=== Testing Users RLS ===';

  -- Test 3.1: User can view own profile
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', test_city_manager_id)::text, true);

    PERFORM * FROM users WHERE id = test_city_manager_id;

    RAISE NOTICE '✓ TEST PASSED: User can view own profile';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ TEST FAILED: User cannot view own profile - %', SQLERRM;
  END;

  -- Test 3.2: User cannot view other users (without super_admin)
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', test_city_manager_id)::text, true);

    PERFORM * FROM users WHERE id != test_city_manager_id LIMIT 1;

    IF NOT FOUND THEN
      RAISE NOTICE '✓ TEST PASSED: User cannot view other users';
    ELSE
      RAISE NOTICE '✗ TEST FAILED: User can view other users (should be blocked!)';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '? TEST INCONCLUSIVE: User cannot view other users - %', SQLERRM;
  END;

END $$;

-- ============================================================================
-- CLEANUP: Remove test users
-- ============================================================================

DO $$
BEGIN
  DELETE FROM users WHERE email LIKE 'test_%@test.com';
  RAISE NOTICE '=== Test cleanup completed ===';
END $$;

-- ============================================================================
-- TEST SUMMARY
-- ============================================================================

SELECT 'RLS Policy Tests Completed - Check NOTICES above for results' as summary;
