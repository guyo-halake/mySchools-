-- Add stream-level performance targets used by Classes and Teacher Dashboard
ALTER TABLE streams
  ADD COLUMN IF NOT EXISTS main_mean_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS target_mean_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS target_term_id UUID REFERENCES terms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_exam_id UUID REFERENCES exams(id) ON DELETE SET NULL;

ALTER TABLE streams
  DROP CONSTRAINT IF EXISTS streams_main_mean_score_range;
ALTER TABLE streams
  ADD CONSTRAINT streams_main_mean_score_range
  CHECK (main_mean_score IS NULL OR (main_mean_score >= 0 AND main_mean_score <= 100));

ALTER TABLE streams
  DROP CONSTRAINT IF EXISTS streams_target_mean_score_range;
ALTER TABLE streams
  ADD CONSTRAINT streams_target_mean_score_range
  CHECK (target_mean_score IS NULL OR (target_mean_score >= 0 AND target_mean_score <= 100));
