-- Dual-mode timetable schema: physical classes and live classes

CREATE TABLE IF NOT EXISTS physical_timetable_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  stream_id UUID REFERENCES streams(id) ON DELETE SET NULL,
  class_label TEXT NOT NULL,
  room TEXT,
  note TEXT,
  is_mine BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS physical_timetable_card_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES physical_timetable_entries(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS live_timetable_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL,
  day_of_week TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  stream_id UUID REFERENCES streams(id) ON DELETE SET NULL,
  topic TEXT,
  teacher_name TEXT,
  class_label TEXT,
  deadline TIMESTAMPTZ,
  source_url TEXT,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_physical_timetable_teacher ON physical_timetable_entries(school_id, teacher_id, day_of_week, start_time);
CREATE INDEX IF NOT EXISTS idx_physical_actions_entry ON physical_timetable_card_actions(entry_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_timetable_teacher ON live_timetable_entries(school_id, teacher_id, start_at, entry_type);

DROP TRIGGER IF EXISTS trg_physical_timetable_updated_at ON physical_timetable_entries;
CREATE TRIGGER trg_physical_timetable_updated_at
BEFORE UPDATE ON physical_timetable_entries
FOR EACH ROW
EXECUTE FUNCTION set_classroom_updated_at();

DROP TRIGGER IF EXISTS trg_live_timetable_updated_at ON live_timetable_entries;
CREATE TRIGGER trg_live_timetable_updated_at
BEFORE UPDATE ON live_timetable_entries
FOR EACH ROW
EXECUTE FUNCTION set_classroom_updated_at();
