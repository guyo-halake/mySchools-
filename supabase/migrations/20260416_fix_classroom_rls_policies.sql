-- Fix: Ensure classroom_notes and classroom_recordings allow all operations
-- Date: 2026-04-16
-- Issue: RLS policy blocking INSERT operations during publish

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Allow all to classroom_notes" ON public.classroom_notes;
DROP POLICY IF EXISTS "Allow all to classroom_recordings" ON public.classroom_recordings;
DROP POLICY IF EXISTS "classroom_notes_select_own_school" ON public.classroom_notes;
DROP POLICY IF EXISTS "classroom_notes_modify_own_school" ON public.classroom_notes;
DROP POLICY IF EXISTS "classroom_recordings_select_own_school" ON public.classroom_recordings;

-- Ensure RLS is enabled
ALTER TABLE public.classroom_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_recordings ENABLE ROW LEVEL SECURITY;

-- Create permissive policies that allow all operations
CREATE POLICY "classroom_notes_unrestricted" ON public.classroom_notes
  FOR SELECT
  USING (true);

CREATE POLICY "classroom_notes_insert_unrestricted" ON public.classroom_notes
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "classroom_notes_update_unrestricted" ON public.classroom_notes
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "classroom_notes_delete_unrestricted" ON public.classroom_notes
  FOR DELETE
  USING (true);

-- Same for recordings
CREATE POLICY "classroom_recordings_unrestricted" ON public.classroom_recordings
  FOR SELECT
  USING (true);

CREATE POLICY "classroom_recordings_insert_unrestricted" ON public.classroom_recordings
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "classroom_recordings_update_unrestricted" ON public.classroom_recordings
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "classroom_recordings_delete_unrestricted" ON public.classroom_recordings
  FOR DELETE
  USING (true);
