-- Run this in your Supabase SQL Editor to add class targeting to Summative Projects

ALTER TABLE cbc_projects 
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id);

-- Optional: Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cbc_projects_class_id ON cbc_projects(class_id);
