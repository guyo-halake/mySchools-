-- HOTFIX: Align classes read visibility with streams to restore Form+Stream dropdown labels.
-- Context: frontend currently receives streams but zero classes under current RLS conditions.
-- This allows SELECT on classes for public role (same exposure pattern currently used by streams).

DROP POLICY IF EXISTS "classes_public_select" ON public.classes;
CREATE POLICY "classes_public_select" ON public.classes
  FOR SELECT
  TO public
  USING (true);
