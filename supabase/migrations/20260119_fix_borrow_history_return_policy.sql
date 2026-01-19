-- ============================================================================
-- Fix RLS Policy for Volunteer Equipment Returns
-- Created: 2026-01-19
-- Description: Allow anonymous users to update borrow_history for equipment returns
--
-- Problem: Volunteers returning equipment via the volunteer page cannot update
-- the borrow_history status to 'pending_approval' because they are not authenticated.
-- The image upload works (uses service role) but the status update fails silently.
-- ============================================================================

-- Allow anyone to update borrow_history for returning equipment
-- This is needed for the volunteer return flow where unauthenticated users
-- need to mark equipment as returned (pending_approval status)
DROP POLICY IF EXISTS "Anyone can return equipment" ON public.borrow_history;
CREATE POLICY "Anyone can return equipment" ON public.borrow_history
  FOR UPDATE
  USING (
    -- Can only update borrowed items (not already returned/approved items)
    status = 'borrowed'
  )
  WITH CHECK (
    -- Can only update to pending_approval status (not directly to returned)
    status = 'pending_approval'
  );

-- Also allow inserting to borrow_history for direct borrow mode
DROP POLICY IF EXISTS "Anyone can borrow equipment" ON public.borrow_history;
CREATE POLICY "Anyone can borrow equipment" ON public.borrow_history
  FOR INSERT
  WITH CHECK (
    -- Can only insert with 'borrowed' status
    status = 'borrowed'
  );

-- Grant UPDATE permission to anonymous users on borrow_history
GRANT UPDATE ON public.borrow_history TO anon;
GRANT INSERT ON public.borrow_history TO anon;
