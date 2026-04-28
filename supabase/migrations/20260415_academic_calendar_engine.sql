-- Academic calendar engine: school year, holidays, events, period cache, and resolver

CREATE TABLE IF NOT EXISTS school_academic_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  year INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Africa/Nairobi',
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, year)
);

CREATE TABLE IF NOT EXISTS term_holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES school_academic_years(id) ON DELETE CASCADE,
  after_term_number INT,
  holiday_type TEXT NOT NULL CHECK (holiday_type IN ('BETWEEN_TERM', 'LONG_HOLIDAY', 'HALF_TERM', 'SPECIAL_CLOSURE')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES school_academic_years(id) ON DELETE CASCADE,
  term_id UUID REFERENCES terms(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  lock_results_workflow BOOLEAN NOT NULL DEFAULT FALSE,
  unlock_results_workflow BOOLEAN NOT NULL DEFAULT FALSE,
  open_exam_window BOOLEAN NOT NULL DEFAULT FALSE,
  close_exam_window BOOLEAN NOT NULL DEFAULT FALSE,
  exam_type exam_type,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_period_state (
  school_id UUID PRIMARY KEY REFERENCES schools(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('IN_TERM', 'HOLIDAY', 'OUT_OF_CALENDAR')),
  active_term_id UUID REFERENCES terms(id) ON DELETE SET NULL,
  active_holiday_id UUID REFERENCES term_holidays(id) ON DELETE SET NULL,
  as_of_date DATE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Africa/Nairobi',
  source TEXT NOT NULL DEFAULT 'AUTO',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_calendar_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_term_holidays_school_dates ON term_holidays (school_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_school_calendar_events_school_dates ON school_calendar_events (school_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_school_calendar_audit_school_created ON school_calendar_audit (school_id, created_at DESC);

CREATE OR REPLACE FUNCTION refresh_school_period_state(
  p_school_id UUID,
  p_actor_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT 'AUTO',
  p_force_term_id UUID DEFAULT NULL,
  p_override_until TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_period TEXT := 'OUT_OF_CALENDAR';
  v_term_id UUID;
  v_holiday_id UUID;
  v_source TEXT := 'AUTO';
BEGIN
  INSERT INTO school_result_controls (school_id)
  VALUES (p_school_id)
  ON CONFLICT (school_id) DO NOTHING;

  IF p_force_term_id IS NOT NULL AND (p_override_until IS NULL OR NOW() <= p_override_until) THEN
    v_term_id := p_force_term_id;
    v_period := 'IN_TERM';
    v_source := 'MANUAL_OVERRIDE';
  ELSE
    SELECT t.id INTO v_term_id
    FROM terms t
    WHERE t.school_id = p_school_id
      AND t.start_date IS NOT NULL
      AND t.end_date IS NOT NULL
      AND v_today BETWEEN t.start_date AND t.end_date
    ORDER BY t.year DESC, t.end_date DESC
    LIMIT 1;

    IF v_term_id IS NOT NULL THEN
      v_period := 'IN_TERM';
      v_source := 'TERM_DATE_RANGE';
    ELSE
      SELECT h.id INTO v_holiday_id
      FROM term_holidays h
      WHERE h.school_id = p_school_id
        AND v_today BETWEEN h.start_date AND h.end_date
      ORDER BY h.start_date DESC
      LIMIT 1;

      IF v_holiday_id IS NOT NULL THEN
        v_period := 'HOLIDAY';
        v_source := 'HOLIDAY_DATE_RANGE';
      ELSE
        v_period := 'OUT_OF_CALENDAR';
        v_source := 'OUTSIDE_DEFINED_RANGES';
      END IF;
    END IF;
  END IF;

  UPDATE school_result_controls
  SET active_term_id = CASE WHEN v_period = 'IN_TERM' THEN v_term_id ELSE NULL END,
      updated_at = NOW()
  WHERE school_id = p_school_id;

  INSERT INTO school_period_state (
    school_id,
    period_type,
    active_term_id,
    active_holiday_id,
    as_of_date,
    source,
    computed_at
  )
  VALUES (
    p_school_id,
    v_period,
    CASE WHEN v_period = 'IN_TERM' THEN v_term_id ELSE NULL END,
    CASE WHEN v_period = 'HOLIDAY' THEN v_holiday_id ELSE NULL END,
    v_today,
    v_source,
    NOW()
  )
  ON CONFLICT (school_id)
  DO UPDATE SET
    period_type = EXCLUDED.period_type,
    active_term_id = EXCLUDED.active_term_id,
    active_holiday_id = EXCLUDED.active_holiday_id,
    as_of_date = EXCLUDED.as_of_date,
    source = EXCLUDED.source,
    computed_at = EXCLUDED.computed_at;

  INSERT INTO school_calendar_audit (school_id, actor_id, action, details)
  VALUES (
    p_school_id,
    p_actor_id,
    'REFRESH_PERIOD_STATE',
    jsonb_build_object(
      'reason', p_reason,
      'period_type', v_period,
      'active_term_id', v_term_id,
      'active_holiday_id', v_holiday_id,
      'source', v_source,
      'as_of_date', v_today,
      'override_until', p_override_until
    )
  );

  RETURN jsonb_build_object(
    'period_type', v_period,
    'active_term_id', v_term_id,
    'active_holiday_id', v_holiday_id,
    'source', v_source,
    'as_of_date', v_today
  );
END;
$$ LANGUAGE plpgsql;

GRANT SELECT, INSERT, UPDATE, DELETE ON school_academic_years TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON term_holidays TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON school_calendar_events TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON school_period_state TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON school_calendar_audit TO anon, authenticated;
GRANT EXECUTE ON FUNCTION refresh_school_period_state(UUID, UUID, TEXT, UUID, TIMESTAMPTZ) TO anon, authenticated;
