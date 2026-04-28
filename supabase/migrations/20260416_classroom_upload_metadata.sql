-- Add rich upload context metadata to classroom uploads.
-- Enables tracking: uploader, audience, class, stream, subject, and recipient students.

ALTER TABLE public.classroom_notes
  ADD COLUMN IF NOT EXISTS stream_id UUID REFERENCES public.streams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS audience_scope TEXT,
  ADD COLUMN IF NOT EXISTS target_student_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS uploaded_by_name TEXT,
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.classroom_recordings
  ADD COLUMN IF NOT EXISTS stream_id UUID REFERENCES public.streams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS audience_scope TEXT,
  ADD COLUMN IF NOT EXISTS target_student_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS uploaded_by_name TEXT,
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_classroom_notes_scope
  ON public.classroom_notes (school_id, class_id, stream_id, subject_id);

CREATE INDEX IF NOT EXISTS idx_classroom_recordings_scope
  ON public.classroom_recordings (school_id, class_id, stream_id, subject_id);
