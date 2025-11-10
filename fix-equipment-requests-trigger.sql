-- Fix the equipment_requests triggers that use user_name
-- Solution: Remove these triggers entirely as they are not needed
-- borrow_history should be created in confirm-pickup API, not on request creation

-- Drop the problematic triggers
DROP TRIGGER IF EXISTS trg_bh_on_er_insert ON equipment_requests;
DROP TRIGGER IF EXISTS trg_bh_on_er_update ON equipment_requests;

-- Drop the old functions
DROP FUNCTION IF EXISTS fn_bh_on_er_insert() CASCADE;
DROP FUNCTION IF EXISTS fn_bh_on_er_update() CASCADE;

-- We are NOT recreating these triggers because:
-- 1. borrow_history should only be created when equipment is actually picked up (confirm-pickup)
-- 2. A request can have multiple items, so one borrow_history per request doesn't make sense
-- 3. The confirm-pickup API already handles creating borrow_history correctly
