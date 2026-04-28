-- Add event creator metadata for events table

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_created_by
  ON public.events (created_by);
