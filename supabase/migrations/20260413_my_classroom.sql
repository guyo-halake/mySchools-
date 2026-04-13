-- My Classroom persistence schema

CREATE TABLE IF NOT EXISTS classroom_sessions (
  id TEXT PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  stream_id UUID REFERENCES streams(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  class_label TEXT,
  day_name TEXT,
  start_time TEXT,
  end_time TEXT,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  room_url TEXT,
  template_started_at TIMESTAMPTZ,
  auto_close_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classroom_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES classroom_sessions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DISCONNECTED',
  hand_raised BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

CREATE TABLE IF NOT EXISTS classroom_hand_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES classroom_sessions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  raised_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lowered_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS classroom_spotlight (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES classroom_sessions(id) ON DELETE CASCADE,
  student_id TEXT,
  student_name TEXT,
  set_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id)
);

CREATE TABLE IF NOT EXISTS classroom_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES classroom_sessions(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'TEXT',
  content TEXT,
  file_url TEXT,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classroom_recordings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES classroom_sessions(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  recording_url TEXT,
  file_url TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classroom_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES classroom_sessions(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classroom_assignment_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES classroom_assignments(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL,
  concept TEXT,
  prompt TEXT NOT NULL,
  options JSONB,
  answer_key TEXT,
  max_score NUMERIC(6,2) NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classroom_assignment_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES classroom_sessions(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES classroom_assignments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES classroom_assignment_questions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  response_text TEXT,
  response_choice TEXT,
  auto_score NUMERIC(6,2),
  rubric_score NUMERIC(6,2),
  max_score NUMERIC(6,2) NOT NULL DEFAULT 10,
  feedback TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classroom_assignment_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES classroom_sessions(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES classroom_assignments(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  file_url TEXT,
  file_path TEXT,
  file_type TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classroom_activity_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES classroom_sessions(id) ON DELETE CASCADE,
  actor_id TEXT,
  actor_name TEXT,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classroom_attendance_session ON classroom_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_classroom_hand_queue_session ON classroom_hand_queue(session_id, is_active);
CREATE INDEX IF NOT EXISTS idx_classroom_notes_session ON classroom_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_classroom_recordings_session ON classroom_recordings(session_id);
CREATE INDEX IF NOT EXISTS idx_classroom_assignments_session ON classroom_assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_classroom_questions_assignment ON classroom_assignment_questions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_classroom_submissions_session ON classroom_assignment_submissions(session_id);
CREATE INDEX IF NOT EXISTS idx_classroom_assignment_files_session ON classroom_assignment_files(session_id);
CREATE INDEX IF NOT EXISTS idx_classroom_activity_session ON classroom_activity_feed(session_id, created_at DESC);

CREATE OR REPLACE FUNCTION set_classroom_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_classroom_sessions_updated_at ON classroom_sessions;
CREATE TRIGGER trg_classroom_sessions_updated_at
BEFORE UPDATE ON classroom_sessions
FOR EACH ROW
EXECUTE FUNCTION set_classroom_updated_at();

DROP TRIGGER IF EXISTS trg_classroom_attendance_updated_at ON classroom_attendance;
CREATE TRIGGER trg_classroom_attendance_updated_at
BEFORE UPDATE ON classroom_attendance
FOR EACH ROW
EXECUTE FUNCTION set_classroom_updated_at();

DROP TRIGGER IF EXISTS trg_classroom_notes_updated_at ON classroom_notes;
CREATE TRIGGER trg_classroom_notes_updated_at
BEFORE UPDATE ON classroom_notes
FOR EACH ROW
EXECUTE FUNCTION set_classroom_updated_at();

DROP TRIGGER IF EXISTS trg_classroom_assignments_updated_at ON classroom_assignments;
CREATE TRIGGER trg_classroom_assignments_updated_at
BEFORE UPDATE ON classroom_assignments
FOR EACH ROW
EXECUTE FUNCTION set_classroom_updated_at();

DROP TRIGGER IF EXISTS trg_classroom_submissions_updated_at ON classroom_assignment_submissions;
CREATE TRIGGER trg_classroom_submissions_updated_at
BEFORE UPDATE ON classroom_assignment_submissions
FOR EACH ROW
EXECUTE FUNCTION set_classroom_updated_at();

ALTER TABLE classroom_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_hand_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_spotlight ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_assignment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_assignment_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_activity_feed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all to classroom_sessions" ON classroom_sessions;
CREATE POLICY "Allow all to classroom_sessions" ON classroom_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all to classroom_attendance" ON classroom_attendance;
CREATE POLICY "Allow all to classroom_attendance" ON classroom_attendance FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all to classroom_hand_queue" ON classroom_hand_queue;
CREATE POLICY "Allow all to classroom_hand_queue" ON classroom_hand_queue FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all to classroom_spotlight" ON classroom_spotlight;
CREATE POLICY "Allow all to classroom_spotlight" ON classroom_spotlight FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all to classroom_notes" ON classroom_notes;
CREATE POLICY "Allow all to classroom_notes" ON classroom_notes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all to classroom_recordings" ON classroom_recordings;
CREATE POLICY "Allow all to classroom_recordings" ON classroom_recordings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all to classroom_assignments" ON classroom_assignments;
CREATE POLICY "Allow all to classroom_assignments" ON classroom_assignments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all to classroom_assignment_questions" ON classroom_assignment_questions;
CREATE POLICY "Allow all to classroom_assignment_questions" ON classroom_assignment_questions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all to classroom_assignment_submissions" ON classroom_assignment_submissions;
CREATE POLICY "Allow all to classroom_assignment_submissions" ON classroom_assignment_submissions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all to classroom_assignment_files" ON classroom_assignment_files;
CREATE POLICY "Allow all to classroom_assignment_files" ON classroom_assignment_files FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all to classroom_activity_feed" ON classroom_activity_feed;
CREATE POLICY "Allow all to classroom_activity_feed" ON classroom_activity_feed FOR ALL USING (true) WITH CHECK (true);
