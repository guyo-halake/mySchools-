-- Results workflow for teacher submit/review/publish flow

DO $$
BEGIN
  ALTER TYPE exam_type ADD VALUE IF NOT EXISTS 'SPECIAL';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE exam_type ADD VALUE IF NOT EXISTS 'INTERNAL';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE results_workflow_status AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'NEEDS_REVISION',
    'APPROVED',
    'PUBLISHED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS results_workflow (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  exam_type exam_type NOT NULL,
  exam_name TEXT NOT NULL,
  marks DECIMAL(5,2) NOT NULL,
  grade TEXT,
  remarks TEXT,
  status results_workflow_status NOT NULL DEFAULT 'DRAFT',
  submitted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  class_teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  review_note TEXT,
  published_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, student_id, subject_id, term_id, exam_type, exam_name)
);

CREATE INDEX IF NOT EXISTS idx_results_workflow_school_stream
  ON results_workflow(school_id, stream_id);

CREATE INDEX IF NOT EXISTS idx_results_workflow_status
  ON results_workflow(status);

CREATE INDEX IF NOT EXISTS idx_results_workflow_student
  ON results_workflow(student_id);

CREATE OR REPLACE FUNCTION set_results_workflow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_results_workflow_updated_at ON results_workflow;

CREATE TRIGGER trg_results_workflow_updated_at
BEFORE UPDATE ON results_workflow
FOR EACH ROW
EXECUTE FUNCTION set_results_workflow_updated_at();

ALTER TABLE results_workflow ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all to results_workflow" ON results_workflow;
CREATE POLICY "Allow all to results_workflow"
ON results_workflow FOR ALL
USING (true)
WITH CHECK (true);
