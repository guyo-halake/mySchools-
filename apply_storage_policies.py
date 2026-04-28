import psycopg2

pg_conn = "postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"

sql = """
-- Enable public read access to classroom files.
-- The app uses custom login and does not establish Supabase Auth sessions,
-- so storage writes must work from the anon client used by the frontend.

DROP POLICY IF EXISTS "Allow public read on classroom-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload to classroom-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public upload to classroom-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow update on classroom-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete on classroom-files" ON storage.objects;

-- STORAGE READ POLICY - Public access to all files
CREATE POLICY "Allow public read on classroom-files" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'classroom-files');

-- STORAGE UPLOAD POLICY - Allow the app's anon client to upload classroom files
CREATE POLICY "Allow public upload to classroom-files" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'classroom-files');
"""

try:
    print("Applying storage policies migration...\n")
    conn = psycopg2.connect(pg_conn)
    cur = conn.cursor()
    
    cur.execute(sql)
    conn.commit()
    
    print("✅ Storage policies applied successfully!\n")
    
    # Verify policies were created
    cur.execute("""
      SELECT policyname, cmd
        FROM pg_policies
      WHERE schemaname = 'storage' AND tablename = 'objects'
        ORDER BY policyname
    """)
    
    policies = cur.fetchall()
    if policies:
        print("Active storage policies:")
        for policy_name, cmd in policies:
            print(f"  ✅ {policy_name} ({cmd})")
    
    cur.close()
    conn.close()

except Exception as e:
    if "already exists" in str(e):
        print("ℹ️  Policies already exist")
    else:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
