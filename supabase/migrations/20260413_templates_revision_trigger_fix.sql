-- Fix template revision trigger behavior:
-- On UPDATE we must return NEW so row changes persist.

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

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
