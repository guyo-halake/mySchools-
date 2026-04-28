-- Hardening templates storage:
-- 1) School-scoped templates and permissions
-- 2) Template revision history for fallback and audits
-- 3) Soft-delete support (do not fully lose deleted templates)

ALTER TABLE templates
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE template_permissions
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'template_permissions_template_key_fkey'
  ) THEN
    ALTER TABLE template_permissions DROP CONSTRAINT template_permissions_template_key_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'template_permissions_template_key_role_key'
  ) THEN
    ALTER TABLE template_permissions DROP CONSTRAINT template_permissions_template_key_role_key;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'templates_key_key'
  ) THEN
    ALTER TABLE templates DROP CONSTRAINT templates_key_key;
  END IF;
END $$;

-- Backfill template school scope from updater profile when possible.
UPDATE templates t
SET school_id = p.school_id
FROM profiles p
WHERE t.school_id IS NULL
  AND t.updated_by = p.id
  AND p.school_id IS NOT NULL;

-- For still-global templates, clone for every school so each school has its own copy.
INSERT INTO templates (
  school_id,
  key,
  name,
  category,
  config,
  active,
  updated_by,
  created_at,
  updated_at,
  archived,
  deleted_at
)
SELECT
  s.id,
  t.key,
  t.name,
  t.category,
  t.config,
  t.active,
  t.updated_by,
  t.created_at,
  t.updated_at,
  COALESCE(t.archived, FALSE),
  t.deleted_at
FROM templates t
CROSS JOIN schools s
WHERE t.school_id IS NULL
ON CONFLICT DO NOTHING;

-- Remove legacy global template rows after clone.
DELETE FROM templates WHERE school_id IS NULL;

-- Backfill permissions by matching school template rows.
INSERT INTO template_permissions (
  school_id,
  template_key,
  role,
  can_view,
  can_use,
  can_edit,
  created_at
)
SELECT
  t.school_id,
  tp.template_key,
  tp.role,
  tp.can_view,
  tp.can_use,
  tp.can_edit,
  tp.created_at
FROM template_permissions tp
JOIN templates t ON t.key = tp.template_key
WHERE tp.school_id IS NULL
ON CONFLICT DO NOTHING;

DELETE FROM template_permissions WHERE school_id IS NULL;

ALTER TABLE templates
  ALTER COLUMN school_id SET NOT NULL;

ALTER TABLE template_permissions
  ALTER COLUMN school_id SET NOT NULL;

ALTER TABLE templates
  ADD CONSTRAINT templates_school_key_unique UNIQUE (school_id, key);

ALTER TABLE template_permissions
  ADD CONSTRAINT template_permissions_school_template_role_unique UNIQUE (school_id, template_key, role);

ALTER TABLE template_permissions
  ADD CONSTRAINT template_permissions_school_template_fkey
  FOREIGN KEY (school_id, template_key)
  REFERENCES templates (school_id, key)
  ON DELETE CASCADE;

DROP INDEX IF EXISTS idx_templates_category;
CREATE INDEX IF NOT EXISTS idx_templates_school_category_active
  ON templates (school_id, category, active)
  WHERE archived = FALSE;

DROP INDEX IF EXISTS idx_template_permissions_lookup;
CREATE INDEX IF NOT EXISTS idx_template_permissions_school_lookup
  ON template_permissions (school_id, template_key, role);

CREATE TABLE IF NOT EXISTS template_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  template_id UUID,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  config JSONB,
  active BOOLEAN NOT NULL,
  archived BOOLEAN NOT NULL,
  deleted_at TIMESTAMPTZ,
  action TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_template_revisions_lookup
  ON template_revisions (school_id, key, changed_at DESC);

CREATE OR REPLACE FUNCTION log_template_revision()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO template_revisions (
    school_id,
    template_id,
    key,
    name,
    category,
    config,
    active,
    archived,
    deleted_at,
    action,
    changed_by,
    changed_at
  )
  VALUES (
    OLD.school_id,
    OLD.id,
    OLD.key,
    OLD.name,
    OLD.category,
    OLD.config,
    OLD.active,
    OLD.archived,
    OLD.deleted_at,
    TG_OP,
    OLD.updated_by,
    NOW()
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_templates_revision_log_update ON templates;
CREATE TRIGGER trg_templates_revision_log_update
BEFORE UPDATE ON templates
FOR EACH ROW
WHEN (OLD IS DISTINCT FROM NEW)
EXECUTE FUNCTION log_template_revision();

DROP TRIGGER IF EXISTS trg_templates_revision_log_delete ON templates;
CREATE TRIGGER trg_templates_revision_log_delete
BEFORE DELETE ON templates
FOR EACH ROW
EXECUTE FUNCTION log_template_revision();
