-- Add Row-Level Security (RLS) to templates table
-- This prevents users from accessing templates outside their school
-- CRITICAL: This must be applied immediately to protect multi-tenant data

CREATE OR REPLACE FUNCTION public.current_user_school_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_user_school_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_school_id() TO authenticated;

DROP POLICY IF EXISTS "templates_select_own_school" ON templates;
DROP POLICY IF EXISTS "templates_update_own_school" ON templates;
DROP POLICY IF EXISTS "templates_insert_own_school" ON templates;
DROP POLICY IF EXISTS "templates_delete_own_school" ON templates;
DROP POLICY IF EXISTS "template_permissions_select_own_school" ON template_permissions;
DROP POLICY IF EXISTS "template_permissions_update_own_school" ON template_permissions;
DROP POLICY IF EXISTS "template_revisions_select_own_school" ON template_revisions;

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Policy 1: TEACHERS/ADMINS can SELECT their school's templates
CREATE POLICY "templates_select_own_school" ON templates
  FOR SELECT
  USING (
    school_id = public.current_user_school_id()
  );

-- Policy 2: TEACHERS/ADMINS can UPDATE their school's templates only
CREATE POLICY "templates_update_own_school" ON templates
  FOR UPDATE
  USING (
    school_id = public.current_user_school_id()
  )
  WITH CHECK (
    school_id = public.current_user_school_id()
  );

-- Policy 3: TEACHERS/ADMINS can INSERT templates only to their school
CREATE POLICY "templates_insert_own_school" ON templates
  FOR INSERT
  WITH CHECK (
    school_id = public.current_user_school_id()
  );

-- Policy 4: TEACHERS/ADMINS can DELETE from their school only
CREATE POLICY "templates_delete_own_school" ON templates
  FOR DELETE
  USING (
    school_id = public.current_user_school_id()
  );

-- Also protect template_permissions
ALTER TABLE template_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "template_permissions_select_own_school" ON template_permissions
  FOR SELECT
  USING (
    school_id = public.current_user_school_id()
  );

CREATE POLICY "template_permissions_update_own_school" ON template_permissions
  FOR UPDATE
  USING (
    school_id = public.current_user_school_id()
  );

-- Protect template_revisions
ALTER TABLE template_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "template_revisions_select_own_school" ON template_revisions
  FOR SELECT
  USING (
    school_id = public.current_user_school_id()
  );

COMMENT ON POLICY "templates_select_own_school" ON templates IS 'Users can only access templates belonging to their school';
COMMENT ON POLICY "templates_update_own_school" ON templates IS 'Users can only modify templates belonging to their school';
COMMENT ON POLICY "templates_insert_own_school" ON templates IS 'Users can only create templates in their school';
COMMENT ON POLICY "templates_delete_own_school" ON templates IS 'Users can only delete templates from their school';
