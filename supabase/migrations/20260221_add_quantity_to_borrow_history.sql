-- Migration: Add quantity column to borrow_history
-- Date: 2026-02-21
-- Description: The direct-borrow flow (city/[cityId]/page.tsx) inserts a quantity field
-- into borrow_history for consumable items, but this column was missing from the schema.
-- This caused all direct borrows to silently fail.

ALTER TABLE public.borrow_history
  ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.borrow_history.quantity IS 'Number of units borrowed (relevant for consumable items)';
