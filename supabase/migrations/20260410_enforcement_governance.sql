-- Governance enforcement for teacher scope, active term, and exam session routing

CREATE TABLE IF NOT EXISTS school_result_controls (
  school_id UUID PRIMARY KEY REFERENCES schools(id) ON DELETE CASCADE,
  active_term_id UUID REFERENCES terms(id) ON DELETE SET NULL,
  enforce_teacher_scope BOOLEAN NOT NULL DEFAULT FALSE,
  enforce_active_term BOOLEAN NOT NULL DEFAULT FALSE,
  enforce_exam_window BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_subject_stream_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_assign_lookup
  ON teacher_subject_stream_assignments (school_id, teacher_id, subject_id, stream_id, class_id)
  WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS exam_windows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  exam_type exam_type NOT NULL,
  name TEXT NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, term_id, exam_type)
);

CREATE INDEX IF NOT EXISTS idx_exam_windows_current
  ON exam_windows (school_id, is_current, is_open, exam_type);

CREATE OR REPLACE FUNCTION set_control_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_school_result_controls_updated_at ON school_result_controls;
CREATE TRIGGER trg_school_result_controls_updated_at
BEFORE UPDATE ON school_result_controls
FOR EACH ROW
EXECUTE FUNCTION set_control_updated_at();

DROP TRIGGER IF EXISTS trg_exam_windows_updated_at ON exam_windows;
CREATE TRIGGER trg_exam_windows_updated_at
BEFORE UPDATE ON exam_windows
FOR EACH ROW
EXECUTE FUNCTION set_control_updated_at();

CREATE OR REPLACE FUNCTION current_school_term_id(p_school_id UUID)
RETURNS UUID AS $$
DECLARE
  v_term UUID;
BEGIN
  SELECT src.active_term_id INTO v_term
  FROM school_result_controls src
  WHERE src.school_id = p_school_id;

  IF v_term IS NOT NULL THEN
    RETURN v_term;
  END IF;

  SELECT t.id INTO v_term
  FROM terms t
  WHERE t.school_id = p_school_id
    AND t.start_date IS NOT NULL
    AND t.end_date IS NOT NULL
    AND CURRENT_DATE BETWEEN t.start_date AND t.end_date
  ORDER BY t.year DESC, t.end_date DESC
  LIMIT 1;

  IF v_term IS NOT NULL THEN
    RETURN v_term;
  END IF;

  SELECT t.id INTO v_term
  FROM terms t
  WHERE t.school_id = p_school_id
  ORDER BY t.year DESC, t.end_date DESC NULLS LAST, t.name ASC
  LIMIT 1;

  RETURN v_term;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION teacher_has_scope(
  p_school_id UUID,
  p_teacher_id UUID,
  p_subject_id UUID,
  p_stream_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_assignments BOOLEAN;
  v_stream_class UUID;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM teacher_subject_stream_assignments tsa
    WHERE tsa.school_id = p_school_id
      AND tsa.teacher_id = p_teacher_id
      AND tsa.active = TRUE
  ) INTO v_has_assignments;

  IF v_has_assignments THEN
    SELECT s.class_id INTO v_stream_class
    FROM streams s
    WHERE s.id = p_stream_id;

    RETURN EXISTS (
      SELECT 1
      FROM teacher_subject_stream_assignments tsa
      WHERE tsa.school_id = p_school_id
        AND tsa.teacher_id = p_teacher_id
        AND tsa.subject_id = p_subject_id
        AND tsa.active = TRUE
        AND (
          tsa.stream_id = p_stream_id
          OR (tsa.class_id IS NOT NULL AND tsa.class_id = v_stream_class)
          OR (tsa.stream_id IS NULL AND tsa.class_id IS NULL)
        )
    );
  END IF;

  -- Safe fallback when explicit assignment rows are missing:
  -- class teacher can work only on their own stream.
  RETURN EXISTS (
    SELECT 1
    FROM streams s
    WHERE s.id = p_stream_id
      AND s.school_id = p_school_id
      AND s.class_teacher_id = p_teacher_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION enforce_results_workflow_rules()
RETURNS TRIGGER AS $$
DECLARE
  v_ctrl school_result_controls%ROWTYPE;
  v_term UUID;
  v_window exam_windows%ROWTYPE;
BEGIN
  SELECT * INTO v_ctrl
  FROM school_result_controls
  WHERE school_id = NEW.school_id;

  IF NOT FOUND THEN
    INSERT INTO school_result_controls (school_id)
    VALUES (NEW.school_id)
    ON CONFLICT (school_id) DO NOTHING;

    SELECT * INTO v_ctrl
    FROM school_result_controls
    WHERE school_id = NEW.school_id;
  END IF;

  IF v_ctrl.enforce_active_term THEN
    v_term := current_school_term_id(NEW.school_id);
    IF v_term IS NULL THEN
      RAISE EXCEPTION 'No active term configured for school %', NEW.school_id;
    END IF;
    NEW.term_id := v_term;
  END IF;

  IF v_ctrl.enforce_exam_window THEN
    SELECT * INTO v_window
    FROM exam_windows ew
    WHERE ew.school_id = NEW.school_id
      AND ew.term_id = NEW.term_id
      AND ew.exam_type = NEW.exam_type
      AND ew.is_current = TRUE
      AND ew.is_open = TRUE
    ORDER BY ew.updated_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No current open exam window for % in selected term', NEW.exam_type;
    END IF;

    NEW.exam_name := v_window.name;
  END IF;

  IF v_ctrl.enforce_teacher_scope THEN
    IF TG_OP = 'INSERT'
      OR NEW.submitted_by <> OLD.submitted_by
      OR NEW.subject_id <> OLD.subject_id
      OR NEW.stream_id <> OLD.stream_id
    THEN
      IF NOT teacher_has_scope(NEW.school_id, NEW.submitted_by, NEW.subject_id, NEW.stream_id) THEN
        RAISE EXCEPTION 'Teacher is not assigned to this subject/stream scope';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_results_workflow_rules ON results_workflow;
CREATE TRIGGER trg_enforce_results_workflow_rules
BEFORE INSERT OR UPDATE ON results_workflow
FOR EACH ROW
EXECUTE FUNCTION enforce_results_workflow_rules();

CREATE OR REPLACE FUNCTION bootstrap_result_governance()
RETURNS VOID AS $$
BEGIN
  INSERT INTO school_result_controls (school_id)
  SELECT s.id FROM schools s
  ON CONFLICT (school_id) DO NOTHING;

  UPDATE school_result_controls src
  SET active_term_id = current_school_term_id(src.school_id)
  WHERE src.active_term_id IS NULL;

  -- Build class-teacher scope from stream ownership across active subjects.
  INSERT INTO teacher_subject_stream_assignments (school_id, teacher_id, subject_id, stream_id, class_id, active)
  SELECT DISTINCT
    sm.school_id,
    sm.class_teacher_id,
    subj.id,
    sm.id,
    sm.class_id,
    TRUE
  FROM streams sm
  JOIN subjects subj ON subj.school_id = sm.school_id AND COALESCE(subj.active, TRUE) = TRUE
  WHERE sm.class_teacher_id IS NOT NULL
  ON CONFLICT DO NOTHING;

  INSERT INTO teacher_subject_stream_assignments (school_id, teacher_id, subject_id, stream_id, class_id, active)
  SELECT DISTINCT
    rw.school_id,
    rw.submitted_by,
    rw.subject_id,
    rw.stream_id,
    sm.class_id,
    TRUE
  FROM results_workflow rw
  LEFT JOIN streams sm ON sm.id = rw.stream_id
  WHERE rw.submitted_by IS NOT NULL
  ON CONFLICT DO NOTHING;

  INSERT INTO exam_windows (school_id, term_id, exam_type, name, is_open, is_current)
  SELECT
    src.school_id,
    src.active_term_id,
    e.exam_type,
    CASE
      WHEN e.exam_type = 'MID_TERM' THEN 'Mid Term - ' || COALESCE((regexp_match(t.name, '(?i)term\s*([123])'))[1], '1') || ' ' || t.year
      WHEN e.exam_type = 'END_TERM' THEN 'End Term - ' || COALESCE((regexp_match(t.name, '(?i)term\s*([123])'))[1], '1') || ' ' || t.year
      WHEN e.exam_type = 'SPECIAL' THEN 'Special - ' || COALESCE((regexp_match(t.name, '(?i)term\s*([123])'))[1], '1') || ' ' || t.year
      ELSE 'Internal - ' || COALESCE((regexp_match(t.name, '(?i)term\s*([123])'))[1], '1') || ' ' || t.year
    END,
    TRUE,
    TRUE
  FROM school_result_controls src
  JOIN terms t ON t.id = src.active_term_id
  CROSS JOIN (SELECT unnest(ARRAY['MID_TERM'::exam_type,'END_TERM'::exam_type,'SPECIAL'::exam_type,'INTERNAL'::exam_type]) AS exam_type) e
  WHERE src.active_term_id IS NOT NULL
  ON CONFLICT (school_id, term_id, exam_type)
  DO UPDATE SET
    name = EXCLUDED.name,
    is_open = TRUE,
    is_current = TRUE,
    updated_at = NOW();

  -- Disable "current" on other terms for each school/type
  UPDATE exam_windows ew
  SET is_current = FALSE,
      is_open = FALSE,
      updated_at = NOW()
  FROM school_result_controls src
  WHERE ew.school_id = src.school_id
    AND src.active_term_id IS NOT NULL
    AND ew.term_id <> src.active_term_id
    AND ew.is_current = TRUE;

  -- Enable enforcement after backfill; this is safe because fallback scope exists.
  UPDATE school_result_controls
  SET enforce_teacher_scope = TRUE,
      enforce_active_term = TRUE,
      enforce_exam_window = TRUE,
      updated_at = NOW();

    -- Safety guard: never enforce on schools without an active term configured.
    UPDATE school_result_controls
    SET enforce_teacher_scope = FALSE,
      enforce_active_term = FALSE,
      enforce_exam_window = FALSE,
      updated_at = NOW()
    WHERE active_term_id IS NULL;
END;
$$ LANGUAGE plpgsql;

SELECT bootstrap_result_governance();
