-- Create tables for E-Library and Matta Academy

CREATE TABLE IF NOT EXISTS e_library_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  resource_type TEXT NOT NULL, -- e.g., 'Digital Book', 'Video Lecture', 'Official PDF', 'Research Paper'
  url TEXT,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  tags TEXT[], -- e.g., ['KICD Approved', 'Grade 7']
  color_theme TEXT, -- e.g., 'from-blue-500/20 to-blue-900/20'
  icon_name TEXT, -- e.g., 'BookOpen', 'FileText'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matta_academy_courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  progress INTEGER DEFAULT 0,
  students_enrolled TEXT, -- e.g., '1.2k'
  syllabus_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE e_library_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE matta_academy_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all to e_library_resources" ON e_library_resources;
CREATE POLICY "Allow all to e_library_resources" ON e_library_resources FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all to matta_academy_courses" ON matta_academy_courses;
CREATE POLICY "Allow all to matta_academy_courses" ON matta_academy_courses FOR ALL USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_e_library_resources_updated_at ON e_library_resources;
CREATE TRIGGER trg_e_library_resources_updated_at
BEFORE UPDATE ON e_library_resources
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_matta_academy_courses_updated_at ON matta_academy_courses;
CREATE TRIGGER trg_matta_academy_courses_updated_at
BEFORE UPDATE ON matta_academy_courses
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
