-- Event reminders for users

CREATE TABLE IF NOT EXISTS public.event_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  remind_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_reminders_school_user
  ON public.event_reminders (school_id, user_id);

CREATE INDEX IF NOT EXISTS idx_event_reminders_event
  ON public.event_reminders (event_id);

ALTER TABLE public.event_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_reminders_select_unrestricted ON public.event_reminders;
DROP POLICY IF EXISTS event_reminders_insert_unrestricted ON public.event_reminders;
DROP POLICY IF EXISTS event_reminders_delete_unrestricted ON public.event_reminders;

CREATE POLICY event_reminders_select_unrestricted ON public.event_reminders
  FOR SELECT
  USING (true);

CREATE POLICY event_reminders_insert_unrestricted ON public.event_reminders
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY event_reminders_delete_unrestricted ON public.event_reminders
  FOR DELETE
  USING (true);
