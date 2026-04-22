-- Run this in your Supabase SQL Editor to fix the fees table
-- This adds the missing created_at column and enables realtime

ALTER TABLE fees ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Enable realtime for fees if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'fees'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE fees;
  END IF;
END $$;
