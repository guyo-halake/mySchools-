-- 🏛️ Institutional Appointment System
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, DECLINED, COMPLETED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_appointments_school ON appointments(school_id);
CREATE INDEX IF NOT EXISTS idx_appointments_parent ON appointments(parent_id);
CREATE INDEX IF NOT EXISTS idx_appointments_teacher ON appointments(teacher_id);
