ALTER TABLE disciplinary_records
  ADD COLUMN IF NOT EXISTS student_name TEXT,
  ADD COLUMN IF NOT EXISTS incident_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verdict TEXT;

UPDATE disciplinary_records
SET incident_at = COALESCE(incident_at, incident_date::timestamp)
WHERE incident_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_disciplinary_records_school_incident_at
  ON disciplinary_records (school_id, incident_at DESC);

CREATE INDEX IF NOT EXISTS idx_disciplinary_records_suspended_by
  ON disciplinary_records (suspended_by);
