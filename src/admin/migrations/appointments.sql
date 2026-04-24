
-- Create Appointments table for Teacher-Parent consultations
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    appointment_time TEXT NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'CANCELLED', 'COMPLETED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Simple RLS Policies
CREATE POLICY "Users can view their own appointments" ON public.appointments
    FOR SELECT USING (
        auth.uid() = teacher_id OR 
        auth.uid() = parent_id OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'PRINCIPAL'))
    );

CREATE POLICY "Parents can create appointments" ON public.appointments
    FOR INSERT WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Teachers can update status" ON public.appointments
    FOR UPDATE USING (auth.uid() = teacher_id);
