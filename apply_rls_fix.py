import psycopg2
import sys

conn_string = "postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"

try:
    print("Connecting to Supabase...")
    conn = psycopg2.connect(conn_string)
    cur = conn.cursor()
    print("✅ Connected!")

    sql = """
-- Fix: Ensure classroom_notes and classroom_recordings allow all operations
DROP POLICY IF EXISTS "Allow all to classroom_notes" ON public.classroom_notes;
DROP POLICY IF EXISTS "Allow all to classroom_recordings" ON public.classroom_recordings;
DROP POLICY IF EXISTS "classroom_notes_select_own_school" ON public.classroom_notes;
DROP POLICY IF EXISTS "classroom_notes_modify_own_school" ON public.classroom_notes;
DROP POLICY IF EXISTS "classroom_recordings_select_own_school" ON public.classroom_recordings;

ALTER TABLE public.classroom_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classroom_notes_unrestricted" ON public.classroom_notes
  FOR SELECT
  USING (true);

CREATE POLICY "classroom_notes_insert_unrestricted" ON public.classroom_notes
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "classroom_notes_update_unrestricted" ON public.classroom_notes
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "classroom_notes_delete_unrestricted" ON public.classroom_notes
  FOR DELETE
  USING (true);

CREATE POLICY "classroom_recordings_unrestricted" ON public.classroom_recordings
  FOR SELECT
  USING (true);

CREATE POLICY "classroom_recordings_insert_unrestricted" ON public.classroom_recordings
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "classroom_recordings_update_unrestricted" ON public.classroom_recordings
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "classroom_recordings_delete_unrestricted" ON public.classroom_recordings
  FOR DELETE
  USING (true);
"""

    print("Applying RLS fix...")
    cur.execute(sql)
    conn.commit()
    print("✅ RLS policies fixed successfully!")
    cur.close()
    conn.close()

except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
