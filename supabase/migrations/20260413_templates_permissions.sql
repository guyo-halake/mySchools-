-- Template registry and permissions for classroom start flows

CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  config JSONB,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS template_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_key TEXT NOT NULL REFERENCES templates(key) ON DELETE CASCADE,
  role TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT TRUE,
  can_use BOOLEAN NOT NULL DEFAULT TRUE,
  can_edit BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(template_key, role)
);

ALTER TABLE classroom_sessions
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS template_key TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_end_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category, active);
CREATE INDEX IF NOT EXISTS idx_template_permissions_lookup ON template_permissions(template_key, role);
CREATE INDEX IF NOT EXISTS idx_classroom_sessions_schedule ON classroom_sessions(status, template_key, scheduled_start_at);

DROP TRIGGER IF EXISTS trg_templates_updated_at ON templates;
CREATE TRIGGER trg_templates_updated_at
BEFORE UPDATE ON templates
FOR EACH ROW
EXECUTE FUNCTION set_classroom_updated_at();
