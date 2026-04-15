-- Fix terms write policies so calendar template save can upsert term rows for the current school.

ALTER TABLE terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "terms_modify_own_school" ON terms;
CREATE POLICY "terms_modify_own_school" ON terms
  FOR UPDATE
  USING (
    school_id = public.current_user_school_id()
  )
  WITH CHECK (
    school_id = public.current_user_school_id()
  );

DROP POLICY IF EXISTS "terms_insert_own_school" ON terms;
CREATE POLICY "terms_insert_own_school" ON terms
  FOR INSERT
  WITH CHECK (
    school_id = public.current_user_school_id()
  );

GRANT SELECT, INSERT, UPDATE ON terms TO authenticated;
