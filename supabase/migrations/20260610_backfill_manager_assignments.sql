-- ============================================================================
-- Backfill: add missing city_manager_assignments for managers who have city_id
-- in public.users but are not yet in city_manager_assignments.
--
-- This covers the case where managers were created (city_id set in users)
-- but the cities table was never updated with their user_id in manager1/manager2
-- slots (so they appear with "no city associated" on login).
-- ============================================================================

INSERT INTO public.city_manager_assignments (city_id, user_id, display_role)
SELECT
  u.city_id,
  u.id,
  'manager1'
FROM public.users u
WHERE u.role        = 'city_manager'
  AND u.city_id     IS NOT NULL
  AND u.is_active   = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM public.city_manager_assignments cma
    WHERE cma.city_id = u.city_id
      AND cma.user_id = u.id
  )
ON CONFLICT (city_id, user_id) DO NOTHING;
