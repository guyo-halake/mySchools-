-- Live session enhancements: bookmarks, catch-up packs, breakout rooms

CREATE TABLE IF NOT EXISTS classroom_moment_bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES classroom_sessions(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  tag TEXT NOT NULL,
  note TEXT,
  marker_time_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classroom_catchup_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES classroom_sessions(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classroom_breakout_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES classroom_sessions(id) ON DELETE CASCADE,
  room_label TEXT NOT NULL,
  room_url TEXT NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classroom_bookmarks_session ON classroom_moment_bookmarks(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_classroom_catchup_session ON classroom_catchup_packs(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_classroom_breakouts_session_active ON classroom_breakout_rooms(session_id, is_active, ends_at);
