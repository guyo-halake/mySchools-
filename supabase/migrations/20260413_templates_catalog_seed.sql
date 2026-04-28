-- Seed required templates and permissions per school

INSERT INTO templates (school_id, key, name, category, config, active, archived, deleted_at)
SELECT
  s.id,
  t.key,
  t.name,
  t.category,
  t.config,
  TRUE,
  FALSE,
  NULL
FROM schools s
CROSS JOIN (
  VALUES
    (
      'TIMETABLE_CLASSES',
      'Timetable and Classes',
      'TIMETABLE',
      jsonb_build_object(
        'schoolStartTime', '08:00',
        'classStartTime', '08:00',
        'classEndTime', '15:00',
        'schoolEndTime', '15:30',
        'periodMinutes', 45,
        'dayOrder', jsonb_build_array('Monday','Tuesday','Wednesday','Thursday','Friday'),
        'breaks', jsonb_build_array(
          jsonb_build_object('id', 'break-1', 'afterPeriods', 2, 'durationMinutes', 20, 'label', 'Morning Break'),
          jsonb_build_object('id', 'break-2', 'afterPeriods', 4, 'durationMinutes', 30, 'label', 'Lunch Break')
        ),
        'customEntries', jsonb_build_array(),
        'notes', 'School-specific timetable engine for period and break routines.'
      )
    ),
    (
      'SYSTEM_ACCESS_AUTH',
      'System Access and Authorizations',
      'SECURITY',
      jsonb_build_object(
        'description', 'Role-based access and authorization guardrails',
        'scopes', jsonb_build_array('view','create','edit','delete','approve','publish')
      )
    ),
    (
      'SYSTEM_UPDATES_MAINTENANCE',
      'System Updates and Maintenance',
      'OPS',
      jsonb_build_object(
        'description', 'System maintenance windows, feature toggles, and update cadence',
        'defaultWindow', 'Sunday 01:00-03:00'
      )
    ),
    (
      'CLASSROOM_START',
      'Class Start Template',
      'CLASSROOM',
      jsonb_build_object(
        'modes', jsonb_build_array('CUSTOM','TEMPLATE'),
        'defaults', jsonb_build_object('durationMinutes', 45)
      )
    ),
    (
      'ACADEMIC_CALENDAR_SETUP',
      'Academic Calendar Setup',
      'ACADEMICS',
      jsonb_build_object(
        'timezone', 'Africa/Nairobi',
        'year', EXTRACT(YEAR FROM CURRENT_DATE)::int,
        'yearStartDate', to_char(date_trunc('year', CURRENT_DATE)::date, 'YYYY-MM-DD'),
        'yearEndDate', to_char((date_trunc('year', CURRENT_DATE) + interval '1 year - 1 day')::date, 'YYYY-MM-DD'),
        'termDurationWeeksMin', 8,
        'termDurationWeeksMax', 28,
        'terms', jsonb_build_array(
          jsonb_build_object('termNumber', 1, 'name', 'Term 1', 'startDate', null, 'endDate', null, 'midBreakStart', null, 'midBreakEnd', null, 'reportDeadline', null, 'resultsDeadline', null),
          jsonb_build_object('termNumber', 2, 'name', 'Term 2', 'startDate', null, 'endDate', null, 'midBreakStart', null, 'midBreakEnd', null, 'reportDeadline', null, 'resultsDeadline', null),
          jsonb_build_object('termNumber', 3, 'name', 'Term 3', 'startDate', null, 'endDate', null, 'midBreakStart', null, 'midBreakEnd', null, 'reportDeadline', null, 'resultsDeadline', null)
        ),
        'holidays', jsonb_build_array(),
        'events', jsonb_build_array(),
        'releaseState', 'DRAFT'
      )
    )
) AS t(key, name, category, config)
ON CONFLICT (school_id, key)
DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  config = EXCLUDED.config,
  active = EXCLUDED.active,
  archived = FALSE,
  deleted_at = NULL,
  updated_at = now();

INSERT INTO template_permissions (school_id, template_key, role, can_view, can_use, can_edit)
SELECT
  s.id,
  p.template_key,
  p.role,
  p.can_view,
  p.can_use,
  p.can_edit
FROM schools s
CROSS JOIN (
  VALUES
    ('TIMETABLE_CLASSES', 'TEACHER', true, true, false),
    ('TIMETABLE_CLASSES', 'ADMIN', true, true, true),
    ('TIMETABLE_CLASSES', 'PRINCIPAL', true, true, true),
    ('SYSTEM_ACCESS_AUTH', 'ADMIN', true, true, true),
    ('SYSTEM_ACCESS_AUTH', 'PRINCIPAL', true, true, true),
    ('SYSTEM_ACCESS_AUTH', 'TEACHER', true, false, false),
    ('SYSTEM_UPDATES_MAINTENANCE', 'ADMIN', true, true, true),
    ('SYSTEM_UPDATES_MAINTENANCE', 'PRINCIPAL', true, true, true),
    ('SYSTEM_UPDATES_MAINTENANCE', 'TEACHER', true, false, false),
    ('CLASSROOM_START', 'TEACHER', true, true, false),
    ('CLASSROOM_START', 'ADMIN', true, true, true),
    ('CLASSROOM_START', 'PRINCIPAL', true, true, true),
    ('ACADEMIC_CALENDAR_SETUP', 'ADMIN', true, true, true),
    ('ACADEMIC_CALENDAR_SETUP', 'PRINCIPAL', true, true, true),
    ('ACADEMIC_CALENDAR_SETUP', 'TEACHER', true, false, false)
) AS p(template_key, role, can_view, can_use, can_edit)
ON CONFLICT (school_id, template_key, role)
DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_use = EXCLUDED.can_use,
  can_edit = EXCLUDED.can_edit;
