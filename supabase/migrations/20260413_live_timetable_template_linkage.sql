-- Link live timetable rows to template identity and template slot windows.

ALTER TABLE live_timetable_entries
  ADD COLUMN IF NOT EXISTS template_key TEXT,
  ADD COLUMN IF NOT EXISTS template_slot_start TEXT,
  ADD COLUMN IF NOT EXISTS template_slot_end TEXT;

UPDATE live_timetable_entries
SET template_key = 'TIMETABLE_CLASSES'
WHERE template_key IS NULL;

CREATE INDEX IF NOT EXISTS idx_live_timetable_template_lookup
  ON live_timetable_entries (school_id, teacher_id, template_key, start_at);
