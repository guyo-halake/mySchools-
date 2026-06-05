-- 1. Fix the RLS Policy for cbc_student_assessments
-- This safely allows an authenticated user to insert assessments for their own school.
-- (Run this in the Supabase SQL Editor)

DROP POLICY IF EXISTS "cbc_insert_own_school" ON cbc_student_assessments;

CREATE POLICY "cbc_insert_own_school"
ON cbc_student_assessments
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND school_id = (SELECT school_id FROM profiles WHERE id = auth.uid() LIMIT 1)
);

-- Alternative: If the above still gives issues due to transaction timing, you can use a simpler approach:
-- CREATE POLICY "cbc_insert_own_school" ON cbc_student_assessments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
