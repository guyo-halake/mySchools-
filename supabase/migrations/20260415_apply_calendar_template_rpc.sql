-- Atomic calendar template save RPC.
-- This function executes calendar sync (terms + academic year + holidays + events + template config)
-- in one transaction to avoid partial writes.

CREATE OR REPLACE FUNCTION public.apply_calendar_template(
  p_template_id UUID,
  p_school_id UUID,
  p_config JSONB,
  p_updated_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template RECORD;
  v_year INT;
  v_timezone TEXT;
  v_terms JSONB;
  v_holidays JSONB;
  v_events JSONB;
  v_term JSONB;
  v_holiday JSONB;
  v_event JSONB;
  v_term_id UUID;
  v_term_number INT;
  v_term_name TEXT;
  v_start_date DATE;
  v_end_date DATE;
  v_year_start DATE;
  v_year_end DATE;
  v_academic_year_id UUID;
BEGIN
  SELECT id, school_id, key INTO v_template
  FROM templates
  WHERE id = p_template_id
  LIMIT 1;

  IF v_template.id IS NULL THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  IF v_template.school_id <> p_school_id THEN
    RAISE EXCEPTION 'Template school mismatch';
  END IF;

  IF v_template.key <> 'ACADEMIC_CALENDAR_SETUP' THEN
    RAISE EXCEPTION 'Template is not academic calendar setup';
  END IF;

  v_year := COALESCE((p_config ->> 'year')::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT);
  v_timezone := COALESCE(p_config ->> 'timezone', 'Africa/Nairobi');
  v_terms := COALESCE(p_config -> 'terms', '[]'::JSONB);
  v_holidays := COALESCE(p_config -> 'holidays', '[]'::JSONB);
  v_events := COALESCE(p_config -> 'events', '[]'::JSONB);

  v_year_start := make_date(v_year, 1, 1);
  v_year_end := make_date(v_year, 12, 31);

  FOR v_term IN SELECT value FROM jsonb_array_elements(v_terms)
  LOOP
    v_term_number := COALESCE((v_term ->> 'termNumber')::INT, 1);
    v_term_name := COALESCE(NULLIF(v_term ->> 'name', ''), 'Term ' || v_term_number);
    v_start_date := NULLIF(v_term ->> 'startDate', '')::DATE;
    v_end_date := NULLIF(v_term ->> 'endDate', '')::DATE;

    IF v_start_date IS NOT NULL AND v_start_date < v_year_start THEN
      v_year_start := v_start_date;
    END IF;

    IF v_end_date IS NOT NULL AND v_end_date > v_year_end THEN
      v_year_end := v_end_date;
    END IF;

    SELECT t.id INTO v_term_id
    FROM terms t
    WHERE t.school_id = p_school_id
      AND t.year = v_year
      AND (
        (substring(lower(t.name) FROM 'term[[:space:]]*([0-9]+)'))::INT = v_term_number
        OR lower(t.name) = lower(v_term_name)
      )
    ORDER BY (lower(t.name) = lower(v_term_name)) DESC, t.start_date DESC NULLS LAST, t.id
    LIMIT 1;

    IF v_term_id IS NULL THEN
      INSERT INTO terms (school_id, name, year, start_date, end_date)
      VALUES (p_school_id, v_term_name, v_year, v_start_date, v_end_date)
      RETURNING id INTO v_term_id;
    ELSE
      UPDATE terms
      SET name = v_term_name,
          year = v_year,
          start_date = v_start_date,
          end_date = v_end_date
      WHERE id = v_term_id;
    END IF;

    -- Keep exactly one term row per school/year/termNumber to avoid duplicate "Term 1" entries.
    DELETE FROM terms t
    WHERE t.school_id = p_school_id
      AND t.year = v_year
      AND t.id <> v_term_id
      AND (substring(lower(t.name) FROM 'term[[:space:]]*([0-9]+)'))::INT = v_term_number;
  END LOOP;

  INSERT INTO school_academic_years (school_id, year, start_date, end_date, timezone, updated_by)
  VALUES (p_school_id, v_year, v_year_start, v_year_end, v_timezone, p_updated_by)
  ON CONFLICT (school_id, year)
  DO UPDATE SET
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    timezone = EXCLUDED.timezone,
    updated_by = EXCLUDED.updated_by,
    updated_at = NOW()
  RETURNING id INTO v_academic_year_id;

  DELETE FROM term_holidays
  WHERE school_id = p_school_id
    AND academic_year_id = v_academic_year_id;

  FOR v_holiday IN SELECT value FROM jsonb_array_elements(v_holidays)
  LOOP
    v_start_date := NULLIF(COALESCE(v_holiday ->> 'startDate', v_holiday ->> 'start_date'), '')::DATE;
    v_end_date := NULLIF(COALESCE(v_holiday ->> 'endDate', v_holiday ->> 'end_date'), '')::DATE;

    IF v_start_date IS NULL OR v_end_date IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO term_holidays (
      id,
      school_id,
      academic_year_id,
      after_term_number,
      holiday_type,
      start_date,
      end_date,
      notes
    )
    VALUES (
      CASE
        WHEN COALESCE(v_holiday ->> 'id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          THEN (v_holiday ->> 'id')::UUID
        ELSE gen_random_uuid()
      END,
      p_school_id,
      v_academic_year_id,
      COALESCE((v_holiday ->> 'afterTermNumber')::INT, (v_holiday ->> 'termNumber')::INT, 1),
      CASE
        WHEN upper(COALESCE(v_holiday ->> 'kind', '')) = 'MID_TERM' THEN 'HALF_TERM'
        ELSE 'LONG_HOLIDAY'
      END,
      v_start_date,
      v_end_date,
      COALESCE(NULLIF(v_holiday ->> 'notes', ''), NULLIF(v_holiday ->> 'title', ''))
    );
  END LOOP;

  DELETE FROM school_calendar_events
  WHERE school_id = p_school_id
    AND academic_year_id = v_academic_year_id;

  FOR v_event IN SELECT value FROM jsonb_array_elements(v_events)
  LOOP
    IF COALESCE(NULLIF(v_event ->> 'title', ''), '') = '' THEN
      CONTINUE;
    END IF;

    v_start_date := NULLIF(COALESCE(v_event ->> 'startDate', v_event ->> 'start_date'), '')::DATE;
    v_end_date := NULLIF(COALESCE(v_event ->> 'endDate', v_event ->> 'end_date'), '')::DATE;

    IF v_start_date IS NULL OR v_end_date IS NULL THEN
      CONTINUE;
    END IF;

    v_term_id := NULL;
    IF COALESCE((v_event ->> 'termNumber')::INT, 0) > 0 THEN
      SELECT t.id INTO v_term_id
      FROM terms t
      WHERE t.school_id = p_school_id
        AND t.year = v_year
        AND (substring(lower(t.name) FROM 'term[[:space:]]*([0-9]+)'))::INT = (v_event ->> 'termNumber')::INT
      ORDER BY t.start_date DESC NULLS LAST, t.id
      LIMIT 1;
    END IF;

    INSERT INTO school_calendar_events (
      id,
      school_id,
      academic_year_id,
      term_id,
      event_type,
      title,
      start_date,
      end_date,
      lock_results_workflow,
      unlock_results_workflow,
      open_exam_window,
      close_exam_window,
      exam_type
    )
    VALUES (
      CASE
        WHEN COALESCE(v_event ->> 'id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          THEN (v_event ->> 'id')::UUID
        ELSE gen_random_uuid()
      END,
      p_school_id,
      v_academic_year_id,
      v_term_id,
      COALESCE(NULLIF(v_event ->> 'eventType', ''), 'CUSTOM'),
      v_event ->> 'title',
      v_start_date,
      v_end_date,
      COALESCE((v_event ->> 'stopAllClasses')::BOOLEAN, FALSE),
      FALSE,
      FALSE,
      FALSE,
      NULL
    );
  END LOOP;

  UPDATE templates
  SET config = p_config,
      active = TRUE,
      updated_by = COALESCE(p_updated_by, updated_by),
      updated_at = NOW()
  WHERE id = p_template_id
    AND school_id = p_school_id;

  PERFORM refresh_school_period_state(p_school_id, p_updated_by, 'CALENDAR_TEMPLATE_UPDATE', NULL, NULL);

  RETURN jsonb_build_object(
    'ok', true,
    'template_id', p_template_id,
    'school_id', p_school_id,
    'year', v_year,
    'academic_year_id', v_academic_year_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_calendar_template(UUID, UUID, JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_calendar_template(UUID, UUID, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_calendar_template(UUID, UUID, JSONB, UUID) TO anon;
