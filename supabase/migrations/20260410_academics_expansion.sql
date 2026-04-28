-- Academic schema expansion for grading, subjects and exam results workflow fields

DO $$
BEGIN
  CREATE TYPE result_entry_status AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'NEEDS_REVISION',
    'APPROVED',
    'PUBLISHED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 1) grading_systems enhancements
ALTER TABLE grading_systems ADD COLUMN IF NOT EXISTS grade_point NUMERIC(4,2);
ALTER TABLE grading_systems ADD COLUMN IF NOT EXISTS is_pass BOOLEAN DEFAULT false;
ALTER TABLE grading_systems ADD COLUMN IF NOT EXISTS sort_order INT;
ALTER TABLE grading_systems ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'SECONDARY';
ALTER TABLE grading_systems ADD COLUMN IF NOT EXISTS applies_to_class_from INT DEFAULT 1;
ALTER TABLE grading_systems ADD COLUMN IF NOT EXISTS applies_to_class_to INT DEFAULT 4;
ALTER TABLE grading_systems ADD COLUMN IF NOT EXISTS effective_from_term_id UUID REFERENCES terms(id) ON DELETE SET NULL;
ALTER TABLE grading_systems ADD COLUMN IF NOT EXISTS effective_to_term_id UUID REFERENCES terms(id) ON DELETE SET NULL;

-- 2) subjects enhancements
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS subject_group TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_elective BOOLEAN DEFAULT false;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS offered_from_class INT DEFAULT 1;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS offered_to_class INT DEFAULT 4;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS weekly_lessons INT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS pass_mark NUMERIC(5,2);
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 999;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- 3) exam_results enhancements
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS status result_entry_status DEFAULT 'PUBLISHED';
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS review_note TEXT;
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS is_absent BOOLEAN DEFAULT false;
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS absence_reason TEXT;
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS is_makeup BOOLEAN DEFAULT false;
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS score_weight NUMERIC(6,3);
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS weighted_score NUMERIC(7,3);
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS source_batch_id TEXT;
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS attempt_no INT DEFAULT 1;
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT false;

UPDATE exam_results
SET attempt_no = 1
WHERE attempt_no IS NULL;

ALTER TABLE exam_results
ALTER COLUMN attempt_no SET DEFAULT 1;

ALTER TABLE exam_results
ALTER COLUMN attempt_no SET NOT NULL;

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION set_exam_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_exam_results_updated_at ON exam_results;
CREATE TRIGGER trg_exam_results_updated_at
BEFORE UPDATE ON exam_results
FOR EACH ROW
EXECUTE FUNCTION set_exam_results_updated_at();

-- Deduplicate before unique index (keep latest)
WITH ranked AS (
  SELECT ctid,
         ROW_NUMBER() OVER (
           PARTITION BY student_id, subject_id, exam_id, attempt_no
           ORDER BY created_at DESC NULLS LAST, ctid DESC
         ) AS rn
  FROM exam_results
)
DELETE FROM exam_results e
USING ranked r
WHERE e.ctid = r.ctid
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_exam_results_student_subject_exam_attempt
ON exam_results(student_id, subject_id, exam_id, attempt_no);
