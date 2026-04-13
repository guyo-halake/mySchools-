-- ==============================================================================
-- COMPREHENSIVE ROW-LEVEL SECURITY (RLS) ENFORCEMENT - ALL MULTI-TENANT TABLES
-- ==============================================================================
-- 
-- This migration enforces school-level data isolation across the entire system.
-- NO teacher, student, result, or class data from one school can ever be accessed by another.
-- 
-- Author: Security Hardening Pass
-- Date: 2026-04-13
-- 
-- ==============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 1: CORE IDENTITY & ORGANIZATIONAL TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- PROFILES TABLE - Users can only see their own profile + schoolmates
DROP POLICY IF EXISTS "profiles_select_own_school" ON profiles;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own_school" ON profiles
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "profiles_update_own_profile" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- CLASSES TABLE - Only see classes from your school
DROP POLICY IF EXISTS "classes_select_own_school" ON classes;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classes_select_own_school" ON classes
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "classes_modify_own_school" ON classes
  FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- STREAMS TABLE - Only see streams from your school
DROP POLICY IF EXISTS "streams_select_own_school" ON streams;
ALTER TABLE streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "streams_select_own_school" ON streams
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "streams_modify_own_school" ON streams
  FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- SUBJECTS TABLE - Only see subjects from your school
DROP POLICY IF EXISTS "subjects_select_own_school" ON subjects;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subjects_select_own_school" ON subjects
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "subjects_modify_own_school" ON subjects
  FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 2: STUDENT ENROLLMENT & HEALTH
-- ═══════════════════════════════════════════════════════════════════════════

-- STUDENTS TABLE
DROP POLICY IF EXISTS "students_select_own_school" ON students;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_select_own_school" ON students
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "students_modify_own_school" ON students
  FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- STUDENT_SUBJECTS TABLE
DROP POLICY IF EXISTS "student_subjects_select_own_school" ON student_subjects;
ALTER TABLE student_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_subjects_select_own_school" ON student_subjects
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "student_subjects_modify_own_school" ON student_subjects
  FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- STUDENT_HEALTH TABLE
DROP POLICY IF EXISTS "student_health_select_own_school" ON student_health;
ALTER TABLE student_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_health_select_own_school" ON student_health
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = student_health.student_id
      AND students.school_id IN (
        SELECT school_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "student_health_modify_own_school" ON student_health
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = student_health.student_id
      AND students.school_id IN (
        SELECT school_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 3: EXTRA-CURRICULAR ACTIVITIES & DISCIPLINE
-- ═══════════════════════════════════════════════════════════════════════════

-- ACTIVITIES TABLE
DROP POLICY IF EXISTS "activities_select_own_school" ON activities;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activities_select_own_school" ON activities
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "activities_modify_own_school" ON activities
  FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- STUDENT_ACTIVITIES TABLE
DROP POLICY IF EXISTS "student_activities_select_own_school" ON student_activities;
ALTER TABLE student_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_activities_select_own_school" ON student_activities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = student_activities.student_id
      AND students.school_id IN (
        SELECT school_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- DISCIPLINARY_RECORDS TABLE
DROP POLICY IF EXISTS "disciplinary_records_select_own_school" ON disciplinary_records;
ALTER TABLE disciplinary_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "disciplinary_records_select_own_school" ON disciplinary_records
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "disciplinary_records_modify_own_school" ON disciplinary_records
  FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 4: ACADEMIC CALENDAR, EXAMS & GRADING
-- ═══════════════════════════════════════════════════════════════════════════

-- TERMS TABLE
DROP POLICY IF EXISTS "terms_select_own_school" ON terms;
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "terms_select_own_school" ON terms
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "terms_modify_own_school" ON terms
  FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- EXAMS TABLE
DROP POLICY IF EXISTS "exams_select_own_school" ON exams;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exams_select_own_school" ON exams
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "exams_modify_own_school" ON exams
  FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- GRADING_SYSTEMS TABLE
DROP POLICY IF EXISTS "grading_systems_select_own_school" ON grading_systems;
ALTER TABLE grading_systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "grading_systems_select_own_school" ON grading_systems
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "grading_systems_modify_own_school" ON grading_systems
  FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- EXAM_RESULTS TABLE
DROP POLICY IF EXISTS "exam_results_select_own_school" ON exam_results;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exam_results_select_own_school" ON exam_results
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "exam_results_modify_own_school" ON exam_results
  FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 5: FINANCIAL & ATTENDANCE
-- ═══════════════════════════════════════════════════════════════════════════

-- FEES TABLE
DROP POLICY IF EXISTS "fees_select_own_school" ON fees;
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fees_select_own_school" ON fees
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "fees_modify_own_school" ON fees
  FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ATTENDANCE TABLE
DROP POLICY IF EXISTS "attendance_select_own_school" ON attendance;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_select_own_school" ON attendance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = attendance.student_id
      AND students.school_id IN (
        SELECT school_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 6: COMMUNICATIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- ANNOUNCEMENTS TABLE
DROP POLICY IF EXISTS "announcements_select_own_school" ON announcements;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements_select_own_school" ON announcements
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "announcements_modify_own_school" ON announcements
  FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- EVENTS TABLE
DROP POLICY IF EXISTS "events_select_own_school" ON events;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_select_own_school" ON events
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "events_modify_own_school" ON events
  FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 7: RESULTS WORKFLOW
-- ═══════════════════════════════════════════════════════════════════════════

-- RESULTS_WORKFLOW TABLE
DROP POLICY IF EXISTS "results_workflow_select_own_school" ON results_workflow;
DROP POLICY IF EXISTS "Allow all to results_workflow" ON results_workflow;
ALTER TABLE results_workflow ENABLE ROW LEVEL SECURITY;

CREATE POLICY "results_workflow_select_own_school" ON results_workflow
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "results_workflow_insert_own_school" ON results_workflow
  FOR INSERT
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "results_workflow_update_own_school" ON results_workflow
  FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "results_workflow_delete_own_school" ON results_workflow
  FOR DELETE
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 8: TIMETABLE ENTRIES
-- ═══════════════════════════════════════════════════════════════════════════

-- PHYSICAL_TIMETABLE_ENTRIES TABLE
DROP POLICY IF EXISTS "physical_timetable_select_own_school" ON physical_timetable_entries;
ALTER TABLE physical_timetable_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "physical_timetable_select_own_school" ON physical_timetable_entries
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "physical_timetable_modify_own_school" ON physical_timetable_entries
  FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- PHYSICAL_TIMETABLE_CARD_ACTIONS TABLE
DROP POLICY IF EXISTS "physical_actions_select_own_school" ON physical_timetable_card_actions;
ALTER TABLE physical_timetable_card_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "physical_actions_select_own_school" ON physical_timetable_card_actions
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- LIVE_TIMETABLE_ENTRIES TABLE
DROP POLICY IF EXISTS "live_timetable_select_own_school" ON live_timetable_entries;
ALTER TABLE live_timetable_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "live_timetable_select_own_school" ON live_timetable_entries
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "live_timetable_modify_own_school" ON live_timetable_entries
  FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 9: CLASSROOM SESSIONS & MANAGEMENT
-- ═══════════════════════════════════════════════════════════════════════════

-- CLASSROOM_SESSIONS TABLE
DROP POLICY IF EXISTS "classroom_sessions_select_own_school" ON classroom_sessions;
ALTER TABLE classroom_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classroom_sessions_select_own_school" ON classroom_sessions
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "classroom_sessions_modify_own_school" ON classroom_sessions
  FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- CLASSROOM_ATTENDANCE TABLE
DROP POLICY IF EXISTS "classroom_attendance_select_own_school" ON classroom_attendance;
ALTER TABLE classroom_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classroom_attendance_select_own_school" ON classroom_attendance
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- CLASSROOM_HAND_QUEUE TABLE
DROP POLICY IF EXISTS "classroom_hand_queue_select_own_school" ON classroom_hand_queue;
ALTER TABLE classroom_hand_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classroom_hand_queue_select_own_school" ON classroom_hand_queue
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- CLASSROOM_SPOTLIGHT TABLE
DROP POLICY IF EXISTS "classroom_spotlight_select_own_school" ON classroom_spotlight;
ALTER TABLE classroom_spotlight ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classroom_spotlight_select_own_school" ON classroom_spotlight
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- CLASSROOM_NOTES TABLE
DROP POLICY IF EXISTS "classroom_notes_select_own_school" ON classroom_notes;
ALTER TABLE classroom_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classroom_notes_select_own_school" ON classroom_notes
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "classroom_notes_modify_own_school" ON classroom_notes
  FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- CLASSROOM_RECORDINGS TABLE
DROP POLICY IF EXISTS "classroom_recordings_select_own_school" ON classroom_recordings;
ALTER TABLE classroom_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classroom_recordings_select_own_school" ON classroom_recordings
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- CLASSROOM_ASSIGNMENTS TABLE
DROP POLICY IF EXISTS "classroom_assignments_select_own_school" ON classroom_assignments;
ALTER TABLE classroom_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classroom_assignments_select_own_school" ON classroom_assignments
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "classroom_assignments_modify_own_school" ON classroom_assignments
  FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- CLASSROOM_ASSIGNMENT_QUESTIONS TABLE
DROP POLICY IF EXISTS "classroom_assignment_questions_select_own_school" ON classroom_assignment_questions;
ALTER TABLE classroom_assignment_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classroom_assignment_questions_select_own_school" ON classroom_assignment_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classroom_assignments
      WHERE classroom_assignments.id = classroom_assignment_questions.assignment_id
      AND classroom_assignments.school_id IN (
        SELECT school_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 10: SUMMARY & VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════

-- Add comments documenting the security hardening
COMMENT ON TABLE profiles IS 'Users restricted to viewing their own school members only';
COMMENT ON TABLE students IS 'Students isolated by school_id - no cross-school access';
COMMENT ON TABLE results_workflow IS 'Results strictly scoped to teacher/school - no other school can see';
COMMENT ON TABLE physical_timetable_entries IS 'Timetable entries bound to school - teachers only see their school data';
COMMENT ON TABLE templates IS 'Templates are school-exclusive - RLS enforced in 20260413_templates_rls_security.sql';
COMMENT ON TABLE classroom_sessions IS 'Classroom sessions fully isolated by school_id';

-- Verify RLS is enabled on critical tables
DO $$
DECLARE
  table_name TEXT;
  row_enabled BOOLEAN;
BEGIN
  FOR table_name IN
    SELECT unnest(ARRAY[
      'profiles', 'students', 'classes', 'streams', 'subjects',
      'student_subjects', 'student_health', 'activities', 'student_activities',
      'disciplinary_records', 'terms', 'exams', 'grading_systems', 'exam_results',
      'fees', 'attendance', 'announcements', 'events', 'results_workflow',
      'physical_timetable_entries', 'physical_timetable_card_actions',
      'live_timetable_entries', 'classroom_sessions', 'classroom_attendance',
      'classroom_hand_queue', 'classroom_spotlight', 'classroom_notes',
      'classroom_recordings', 'classroom_assignments', 'classroom_assignment_questions'
    ])
  LOOP
    SELECT c.relrowsecurity
      INTO row_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = table_name;

    IF row_enabled IS DISTINCT FROM TRUE THEN
      RAISE WARNING 'RLS NOT ENABLED ON: %', table_name;
    END IF;
  END LOOP;

  RAISE NOTICE 'Comprehensive RLS hardening applied to all multi-tenant tables';
END $$;
