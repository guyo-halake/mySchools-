

-- Trigger function to sync published results from results_workflow to exam_results
CREATE OR REPLACE FUNCTION sync_results_workflow_to_exam_results()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if status is PUBLISHED
  IF (NEW.status = 'PUBLISHED') THEN
    -- Upsert into exam_results
    INSERT INTO exam_results (
      id, school_id, student_id, subject_id, marks, grade, created_at, status, reviewed_by, review_note, published_by, published_at, updated_at
    ) VALUES (
      COALESCE(NEW.id, gen_random_uuid()),
      NEW.school_id, NEW.student_id, NEW.subject_id, NEW.marks, NEW.grade, NEW.created_at, NEW.status, NEW.reviewed_by, NEW.review_note, NEW.published_by, NEW.published_at, NEW.updated_at
    )
    ON CONFLICT (school_id, student_id, subject_id)
    DO UPDATE SET
      marks = EXCLUDED.marks,
      grade = EXCLUDED.grade,
      updated_at = EXCLUDED.updated_at,
      published_at = EXCLUDED.published_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for INSERT/UPDATE
DROP TRIGGER IF EXISTS trg_sync_results_workflow_to_exam_results ON results_workflow;
CREATE TRIGGER trg_sync_results_workflow_to_exam_results
AFTER INSERT OR UPDATE ON results_workflow
FOR EACH ROW EXECUTE FUNCTION sync_results_workflow_to_exam_results();

-- Backfill: Copy all existing PUBLISHED results into exam_results
INSERT INTO exam_results (
  id, school_id, student_id, subject_id, marks, grade, created_at, status, reviewed_by, review_note, published_by, published_at, updated_at
)
SELECT 
  COALESCE(id, gen_random_uuid()),
  school_id, student_id, subject_id, marks, grade, created_at, status, reviewed_by, review_note, published_by, published_at, updated_at
FROM results_workflow
WHERE status = 'PUBLISHED'
ON CONFLICT (school_id, student_id, subject_id)
DO UPDATE SET
  marks = EXCLUDED.marks,
  grade = EXCLUDED.grade,
  updated_at = EXCLUDED.updated_at,
  published_at = EXCLUDED.published_at;
