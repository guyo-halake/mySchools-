-- 1. Extend Subjects with Compulsory Flag
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_compulsory BOOLEAN DEFAULT false;

-- 2. Student Enrollment (Junction Table)
CREATE TABLE IF NOT EXISTS student_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, subject_id)
);

-- 3. Student Health Records
CREATE TABLE IF NOT EXISTS student_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  blood_group TEXT,
  allergies TEXT,
  chronic_conditions TEXT,
  emergency_notes TEXT,
  last_checkup DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Extra-Curricular Activities
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT, -- 'SPORT', 'CLUB', 'SOCIETY'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'MEMBER', -- 'CAPTAIN', 'CHAIRMAN', etc.
  joined_at DATE DEFAULT CURRENT_DATE,
  UNIQUE(student_id, activity_id)
);

-- 5. Disciplinary Records (The Justice Ledger)
CREATE TABLE IF NOT EXISTS disciplinary_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
  incident_title TEXT NOT NULL,
  description TEXT, -- What happened
  motive TEXT, -- Why it happened
  reported_by TEXT, -- Found by who (Name or ID)
  action_taken TEXT, -- 'Suspension', 'Detention', 'Letter to Parent'
  status TEXT DEFAULT 'OPEN', -- 'OPEN', 'RESOLVED'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (though we are running in dev mode for now)
ALTER TABLE student_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE disciplinary_records ENABLE ROW LEVEL SECURITY;

-- Basic All-Access Policies for Dev
CREATE POLICY "Allow all to student_subjects" ON student_subjects FOR ALL USING (true);
CREATE POLICY "Allow all to student_health" ON student_health FOR ALL USING (true);
CREATE POLICY "Allow all to activities" ON activities FOR ALL USING (true);
CREATE POLICY "Allow all to student_activities" ON student_activities FOR ALL USING (true);
CREATE POLICY "Allow all to disciplinary_records" ON disciplinary_records FOR ALL USING (true);
