-- Term averages derived from MID_TERM and END_TERM exam results

CREATE TABLE IF NOT EXISTS student_subject_term_averages (
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  mid_term_mark NUMERIC(5,2),
  mid_term_grade TEXT,
  end_term_mark NUMERIC(5,2),
  end_term_grade TEXT,
  average_mark NUMERIC(5,2) NOT NULL,
  average_grade TEXT,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (school_id, student_id, term_id, subject_id)
);

CREATE TABLE IF NOT EXISTS student_term_averages (
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  subjects_count INT NOT NULL DEFAULT 0,
  average_mark NUMERIC(5,2) NOT NULL,
  average_grade TEXT,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (school_id, student_id, term_id)
);

CREATE INDEX IF NOT EXISTS idx_student_subject_term_averages_lookup
  ON student_subject_term_averages(school_id, term_id, student_id, subject_id);

CREATE INDEX IF NOT EXISTS idx_student_term_averages_lookup
  ON student_term_averages(school_id, term_id, student_id);

CREATE OR REPLACE FUNCTION set_term_avg_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_student_subject_term_averages_updated_at ON student_subject_term_averages;
CREATE TRIGGER trg_student_subject_term_averages_updated_at
BEFORE UPDATE ON student_subject_term_averages
FOR EACH ROW
EXECUTE FUNCTION set_term_avg_updated_at();

DROP TRIGGER IF EXISTS trg_student_term_averages_updated_at ON student_term_averages;
CREATE TRIGGER trg_student_term_averages_updated_at
BEFORE UPDATE ON student_term_averages
FOR EACH ROW
EXECUTE FUNCTION set_term_avg_updated_at();

CREATE OR REPLACE FUNCTION calculate_grade_from_mark(
  p_school_id UUID,
  p_mark NUMERIC
)
RETURNS TEXT AS $$
  SELECT gs.grade
  FROM grading_systems gs
  WHERE gs.school_id = p_school_id
    AND p_mark >= gs.min_mark
    AND p_mark <= gs.max_mark
  ORDER BY COALESCE(gs.sort_order, 999), gs.max_mark ASC
  LIMIT 1;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION recompute_student_term_averages(
  p_school_id UUID DEFAULT NULL,
  p_term_id UUID DEFAULT NULL,
  p_student_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  DELETE FROM student_subject_term_averages ssta
  WHERE (p_school_id IS NULL OR ssta.school_id = p_school_id)
    AND (p_term_id IS NULL OR ssta.term_id = p_term_id)
    AND (p_student_id IS NULL OR ssta.student_id = p_student_id);

  DELETE FROM student_term_averages sta
  WHERE (p_school_id IS NULL OR sta.school_id = p_school_id)
    AND (p_term_id IS NULL OR sta.term_id = p_term_id)
    AND (p_student_id IS NULL OR sta.student_id = p_student_id);

  WITH subject_rollup AS (
    SELECT
      er.school_id,
      er.student_id,
      ex.term_id,
      er.subject_id,
      AVG(CASE WHEN ex.type = 'MID_TERM' THEN er.marks END)::NUMERIC(5,2) AS mid_term_mark,
      AVG(CASE WHEN ex.type = 'END_TERM' THEN er.marks END)::NUMERIC(5,2) AS end_term_mark
    FROM exam_results er
    JOIN exams ex ON ex.id = er.exam_id
    WHERE ex.type IN ('MID_TERM', 'END_TERM')
      AND (p_school_id IS NULL OR er.school_id = p_school_id)
      AND (p_term_id IS NULL OR ex.term_id = p_term_id)
      AND (p_student_id IS NULL OR er.student_id = p_student_id)
    GROUP BY er.school_id, er.student_id, ex.term_id, er.subject_id
  ), normalized AS (
    SELECT
      sr.school_id,
      sr.student_id,
      sr.term_id,
      sr.subject_id,
      sr.mid_term_mark,
      calculate_grade_from_mark(sr.school_id, sr.mid_term_mark) AS mid_term_grade,
      sr.end_term_mark,
      calculate_grade_from_mark(sr.school_id, sr.end_term_mark) AS end_term_grade,
      CASE
        WHEN sr.mid_term_mark IS NOT NULL AND sr.end_term_mark IS NOT NULL THEN ROUND(((sr.mid_term_mark + sr.end_term_mark) / 2.0)::NUMERIC, 2)
        WHEN sr.mid_term_mark IS NOT NULL THEN ROUND(sr.mid_term_mark::NUMERIC, 2)
        WHEN sr.end_term_mark IS NOT NULL THEN ROUND(sr.end_term_mark::NUMERIC, 2)
        ELSE NULL
      END AS average_mark
    FROM subject_rollup sr
  )
  INSERT INTO student_subject_term_averages (
    school_id,
    student_id,
    term_id,
    subject_id,
    mid_term_mark,
    mid_term_grade,
    end_term_mark,
    end_term_grade,
    average_mark,
    average_grade,
    calculated_at
  )
  SELECT
    n.school_id,
    n.student_id,
    n.term_id,
    n.subject_id,
    n.mid_term_mark,
    n.mid_term_grade,
    n.end_term_mark,
    n.end_term_grade,
    n.average_mark,
    calculate_grade_from_mark(n.school_id, n.average_mark),
    NOW()
  FROM normalized n
  WHERE n.average_mark IS NOT NULL;

  INSERT INTO student_term_averages (
    school_id,
    student_id,
    term_id,
    subjects_count,
    average_mark,
    average_grade,
    calculated_at
  )
  SELECT
    ssta.school_id,
    ssta.student_id,
    ssta.term_id,
    COUNT(*)::INT AS subjects_count,
    ROUND(AVG(ssta.average_mark)::NUMERIC, 2) AS average_mark,
    calculate_grade_from_mark(ssta.school_id, ROUND(AVG(ssta.average_mark)::NUMERIC, 2)) AS average_grade,
    NOW()
  FROM student_subject_term_averages ssta
  WHERE (p_school_id IS NULL OR ssta.school_id = p_school_id)
    AND (p_term_id IS NULL OR ssta.term_id = p_term_id)
    AND (p_student_id IS NULL OR ssta.student_id = p_student_id)
  GROUP BY ssta.school_id, ssta.student_id, ssta.term_id;
END;
$$ LANGUAGE plpgsql;

-- Optional convenience views for reporting
CREATE OR REPLACE VIEW v_student_subject_term_averages AS
SELECT
  ssta.*, 
  subj.name AS subject_name,
  t.name AS term_name,
  t.year AS term_year
FROM student_subject_term_averages ssta
LEFT JOIN subjects subj ON subj.id = ssta.subject_id
LEFT JOIN terms t ON t.id = ssta.term_id;

CREATE OR REPLACE VIEW v_student_term_averages AS
SELECT
  sta.*,
  t.name AS term_name,
  t.year AS term_year
FROM student_term_averages sta
LEFT JOIN terms t ON t.id = sta.term_id;

ALTER TABLE student_subject_term_averages ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_term_averages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all to student_subject_term_averages" ON student_subject_term_averages;
CREATE POLICY "Allow all to student_subject_term_averages"
ON student_subject_term_averages FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all to student_term_averages" ON student_term_averages;
CREATE POLICY "Allow all to student_term_averages"
ON student_term_averages FOR ALL
USING (true)
WITH CHECK (true);
