-- Enable public read access to classroom files.
-- The app uses custom login and does not establish Supabase Auth sessions,
-- so storage writes must work from the anon client used by the frontend.

DROP POLICY IF EXISTS "Allow public read on classroom-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload to classroom-files" ON storage.objects;
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

