-- Initial Schema for SchoolPortal Multi-Tenant System
-- Created: 2026-04-09

-- ENABLE UUID EXTENSION
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SCHOOLS (The Tenant)
CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    location TEXT,
    phone_numbers TEXT[], -- Supports multiple numbers
    bank_name TEXT,
    bank_acc TEXT,
    paybill_no TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'TEACHER', 'PARENT', 'STUDENT', 'STAFF');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE exam_type AS ENUM ('MID_TERM', 'END_TERM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE fee_status AS ENUM ('PAID', 'PARTIAL', 'UNPAID');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('PRESENT', 'ABSENT', 'LATE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE discipline_status AS ENUM ('ACTIVE', 'RESOLVED', 'ACKNOWLEDGED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY, -- Same as auth.users id
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'STUDENT',
    password TEXT DEFAULT 'password123',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ACADEMIC STRUCTURE
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g., 'Form 1', 'Grade 7'
    level INTEGER -- Numerical level for sorting
);

CREATE TABLE IF NOT EXISTS streams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g., 'N', 'C', 'North', 'Blue'
    class_teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT -- e.g., 'MAT', 'ENG'
);

-- 5. SPECIFIC ENTITY DATA
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    adm_no TEXT NOT NULL,
    stream_id UUID REFERENCES streams(id) ON DELETE SET NULL,
    parent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    sport TEXT,
    discipline_status discipline_status DEFAULT 'RESOLVED',
    date_of_birth DATE,
    address TEXT,
    UNIQUE(school_id, adm_no)
);

CREATE TABLE IF NOT EXISTS student_subjects (
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    PRIMARY KEY (student_id, subject_id)
);

-- 6. EXAMS & GRADING
CREATE TABLE IF NOT EXISTS terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- 'Term 1', 'Term 2', 'Term 3'
    year INTEGER NOT NULL,
    start_date DATE,
    end_date DATE
);

CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- 'Mid-term', 'End-term'
    type exam_type NOT NULL,
    date DATE
);

CREATE TABLE IF NOT EXISTS grading_systems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    min_mark INTEGER NOT NULL,
    max_mark INTEGER NOT NULL,
    grade TEXT NOT NULL,
    remarks TEXT
);

CREATE TABLE IF NOT EXISTS exam_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    marks DECIMAL(5,2) NOT NULL,
    grade TEXT, -- Can be triggered/calculated
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. OPERATIONS
CREATE TABLE IF NOT EXISTS fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'Tuition', 'Activity', etc.
    amount_due DECIMAL(12,2) NOT NULL,
    amount_paid DECIMAL(12,2) DEFAULT 0,
    status fee_status DEFAULT 'UNPAID',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    status attendance_status NOT NULL,
    term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
    remarks TEXT
);

-- 8. COMMUNICATIONS
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES profiles(id),
    target_roles user_role[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    date TIMESTAMPTZ NOT NULL,
    location TEXT,
    rsvps UUID[] -- array of profile ids
);

-- SECURITY: ROW LEVEL SECURITY (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
-- ... more RLS policies would go here, but I'll provide basic "one school" restriction logic ...

-- Create a policy that allows users to only see data from their school_id
-- CREATE POLICY school_isolation ON profiles 
-- FOR SELECT USING (school_id = (SELECT school_id FROM profiles WHERE id = auth.uid()));
