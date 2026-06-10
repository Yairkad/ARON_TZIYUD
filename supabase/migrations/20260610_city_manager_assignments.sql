-- ============================================================================
-- City Manager Assignments Junction Table
-- Created: 2026-06-10
-- Description: Replaces the 2-slot (manager1_user_id/manager2_user_id) approach
--              on the cities table with a proper junction table that supports
--              unlimited managers per city. Also adds per-manager contact visibility
--              control (is_contact_visible / override_name / override_phone).
-- ============================================================================

-- ============================================================================
-- 1. Create the junction table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.city_manager_assignments (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  city_id       UUID        NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
  display_role  TEXT        NOT NULL DEFAULT 'manager1',          -- cosmetic label only
  is_contact_visible BOOLEAN NOT NULL DEFAULT TRUE,               -- show contact to volunteers?
  override_name  TEXT       NULL,                                  -- shown instead of real name when visible
  override_phone TEXT       NULL,                                  -- shown instead of real phone when visible
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (city_id, user_id)
);

-- ============================================================================
-- 2. Enable RLS
-- ============================================================================

ALTER TABLE public.city_manager_assignments ENABLE ROW LEVEL SECURITY;

-- Super admins have full access
CREATE POLICY "Super admins manage city_manager_assignments"
  ON public.city_manager_assignments FOR ALL
  USING (public.is_super_admin());

-- City managers can view their own assignments
CREATE POLICY "City managers view own assignments"
  ON public.city_manager_assignments FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================================
-- 3. Migrate existing data from cities.manager1_user_id / manager2_user_id
-- ============================================================================

-- Migrate manager1 assignments
INSERT INTO public.city_manager_assignments (city_id, user_id, display_role, is_contact_visible)
SELECT
  c.id,
  c.manager1_user_id,
  'manager1',
  COALESCE(c.show_manager1_contact, TRUE)
FROM public.cities c
WHERE c.manager1_user_id IS NOT NULL
ON CONFLICT (city_id, user_id) DO NOTHING;

-- Migrate manager2 assignments
INSERT INTO public.city_manager_assignments (city_id, user_id, display_role, is_contact_visible)
SELECT
  c.id,
  c.manager2_user_id,
  'manager2',
  COALESCE(c.show_manager2_contact, TRUE)
FROM public.cities c
WHERE c.manager2_user_id IS NOT NULL
ON CONFLICT (city_id, user_id) DO NOTHING;

-- Migrate override_name / override_phone for manager1
UPDATE public.city_manager_assignments cma
SET
  override_name  = c.override_manager1_name,
  override_phone = c.override_manager1_phone
FROM public.cities c
WHERE cma.city_id = c.id
  AND cma.user_id = c.manager1_user_id
  AND (c.override_manager1_name IS NOT NULL OR c.override_manager1_phone IS NOT NULL);

-- Migrate override_name / override_phone for manager2
UPDATE public.city_manager_assignments cma
SET
  override_name  = c.override_manager2_name,
  override_phone = c.override_manager2_phone
FROM public.cities c
WHERE cma.city_id = c.id
  AND cma.user_id = c.manager2_user_id
  AND (c.override_manager2_name IS NOT NULL OR c.override_manager2_phone IS NOT NULL);

-- ============================================================================
-- 4. Update helper functions to use the junction table
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_manager_of_city(city_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.city_manager_assignments
    WHERE city_id = city_uuid
      AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_managed_city_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
    SELECT city_id FROM public.city_manager_assignments
    WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. Summary
-- ============================================================================
-- • city_manager_assignments is now the authoritative source for who can manage
--   which city.  The old manager1_user_id / manager2_user_id columns on cities
--   are kept for backwards-compat display (manager contact info for volunteers)
--   but are no longer used for auth / access decisions.
-- • display_role ('manager1' | 'manager2') is a cosmetic label only – it does
--   not enforce any slot limit.
-- • is_contact_visible controls whether this manager appears as a contact for
--   volunteers (integrates the existing show_manager1/2_contact logic).
-- • The RLS helper functions now query this table, so all downstream RLS
--   policies that call is_manager_of_city() / get_user_managed_city_ids()
--   automatically benefit without further changes.
