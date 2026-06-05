-- Create cbc_student_assessments table
CREATE TABLE IF NOT EXISTS public.cbc_student_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    strand TEXT NOT NULL,
    sub_strand TEXT NOT NULL,
    rating TEXT NOT NULL,
    raw_score INTEGER,
    teacher_comment TEXT,
    grade_level_at_time INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.cbc_student_assessments ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
DROP POLICY IF EXISTS "cbc_select_own_school" ON public.cbc_student_assessments;
CREATE POLICY "cbc_select_own_school" ON public.cbc_student_assessments
  FOR SELECT
  USING (school_id = public.current_user_school_id());

DROP POLICY IF EXISTS "cbc_insert_own_school" ON public.cbc_student_assessments;
CREATE POLICY "cbc_insert_own_school" ON public.cbc_student_assessments
  FOR INSERT
  WITH CHECK (school_id = public.current_user_school_id());

DROP POLICY IF EXISTS "cbc_update_own_school" ON public.cbc_student_assessments;
CREATE POLICY "cbc_update_own_school" ON public.cbc_student_assessments
  FOR UPDATE
  USING (school_id = public.current_user_school_id())
  WITH CHECK (school_id = public.current_user_school_id());

DROP POLICY IF EXISTS "cbc_delete_own_school" ON public.cbc_student_assessments;
CREATE POLICY "cbc_delete_own_school" ON public.cbc_student_assessments
  FOR DELETE
  USING (school_id = public.current_user_school_id());

-- Modify Exams table type to support FORMATIVE and SUMMATIVE.
-- We convert it to TEXT to remove any existing enum or check constraints safely.
ALTER TABLE public.exams ALTER COLUMN type TYPE TEXT;
