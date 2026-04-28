-- Migration: Add fee_types table
CREATE TABLE IF NOT EXISTS fee_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_recurring BOOLEAN DEFAULT false, -- repeats every term
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed initial types
-- INSERT INTO fee_types (school_id, name, is_recurring) VALUES (..., 'Tuition', true);
