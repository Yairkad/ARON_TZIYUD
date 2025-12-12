-- ============================================================================
-- Migration: Wheel Lending Stations
-- Created: 2025-12-04
-- Description: Creates tables for wheel lending stations feature
-- ============================================================================

-- Step 1: Create wheel_stations table
CREATE TABLE IF NOT EXISTS public.wheel_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES public.cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create wheel_station_managers table (1-4 managers per station)
CREATE TABLE IF NOT EXISTS public.wheel_station_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES public.wheel_stations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT DEFAULT 'מנהל תחנה', -- e.g., 'מנהל תחנה ראשי', 'מנהל תחנה'
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create wheels table
CREATE TABLE IF NOT EXISTS public.wheels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES public.wheel_stations(id) ON DELETE CASCADE,
  wheel_number INTEGER NOT NULL, -- The serial number (e.g., 10, 12, 50)
  rim_size TEXT NOT NULL, -- e.g., "14", "15", "16"
  bolt_count INTEGER NOT NULL, -- e.g., 4, 5
  bolt_spacing DECIMAL(5,1) NOT NULL, -- e.g., 100, 108, 114.3
  category TEXT, -- e.g., 'צרפתיות', 'יפניות/קוראניות', 'גרמניות'
  is_donut BOOLEAN DEFAULT false, -- True if it's a spare/donut wheel
  notes TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each wheel number should be unique within a station
  CONSTRAINT unique_wheel_number_per_station UNIQUE (station_id, wheel_number)
);

-- Step 4: Create wheel_borrows table (tracking who borrowed)
CREATE TABLE IF NOT EXISTS public.wheel_borrows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wheel_id UUID NOT NULL REFERENCES public.wheels(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES public.wheel_stations(id) ON DELETE CASCADE,
  borrower_name TEXT NOT NULL,
  borrower_phone TEXT NOT NULL,
  borrow_date TIMESTAMPTZ DEFAULT NOW(),
  expected_return_date TIMESTAMPTZ,
  actual_return_date TIMESTAMPTZ,
  deposit_type TEXT, -- 'id', 'cash', 'other', 'none'
  deposit_details TEXT, -- Amount for cash, description for other
  notes TEXT,
  status TEXT DEFAULT 'borrowed', -- 'borrowed', 'returned'
  created_by_manager_id UUID, -- Which manager logged this borrow
  returned_by_manager_id UUID, -- Which manager logged the return
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 5: Create indexes
CREATE INDEX idx_wheel_stations_city ON public.wheel_stations(city_id);
CREATE INDEX idx_wheel_stations_active ON public.wheel_stations(is_active);
CREATE INDEX idx_wheels_station ON public.wheels(station_id);
CREATE INDEX idx_wheels_available ON public.wheels(is_available);
CREATE INDEX idx_wheel_borrows_wheel ON public.wheel_borrows(wheel_id);
CREATE INDEX idx_wheel_borrows_station ON public.wheel_borrows(station_id);
CREATE INDEX idx_wheel_borrows_status ON public.wheel_borrows(status);
CREATE INDEX idx_wheel_borrows_expected_return ON public.wheel_borrows(expected_return_date);

-- Step 6: Auto-update updated_at triggers
CREATE TRIGGER wheel_stations_updated_at
  BEFORE UPDATE ON public.wheel_stations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER wheels_updated_at
  BEFORE UPDATE ON public.wheels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER wheel_borrows_updated_at
  BEFORE UPDATE ON public.wheel_borrows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Enable Row Level Security
ALTER TABLE public.wheel_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wheel_station_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wheels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wheel_borrows ENABLE ROW LEVEL SECURITY;

-- Step 8: RLS Policies

-- Wheel Stations - public read access (anyone can see station list)
CREATE POLICY "Anyone can view active wheel stations" ON public.wheel_stations
  FOR SELECT USING (is_active = true);

CREATE POLICY "Super admins manage all wheel stations" ON public.wheel_stations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Station Managers - public read access for contact info
CREATE POLICY "Anyone can view station managers" ON public.wheel_station_managers
  FOR SELECT USING (true);

CREATE POLICY "Super admins manage station managers" ON public.wheel_station_managers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Wheels - public read access
CREATE POLICY "Anyone can view wheels" ON public.wheels
  FOR SELECT USING (true);

CREATE POLICY "Super admins manage all wheels" ON public.wheels
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Wheel Borrows - managers only (for privacy)
CREATE POLICY "Super admins view all wheel borrows" ON public.wheel_borrows
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Super admins manage wheel borrows" ON public.wheel_borrows
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Grant basic permissions
GRANT SELECT ON public.wheel_stations TO anon, authenticated;
GRANT SELECT ON public.wheel_station_managers TO anon, authenticated;
GRANT SELECT ON public.wheels TO anon, authenticated;
GRANT SELECT ON public.wheel_borrows TO authenticated;

-- ============================================================================
-- Migration Complete
-- Tables: wheel_stations, wheel_station_managers, wheels, wheel_borrows
-- ============================================================================
