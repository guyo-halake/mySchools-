-- Add primary_color to schools table for white-labeling
ALTER TABLE schools ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#18181b'; -- Default zinc-900
