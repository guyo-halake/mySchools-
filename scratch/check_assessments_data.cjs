const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://vomsaqkhtturzqfuwxsn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcwMjE2OCwiZXhwIjoyMDkxMjc4MTY4fQ.lGkYaJ5rZQ9pnBLqn3YZMi5c5IJ_mFf-NhniKSi73IY'
);

async function checkData() {
  const { data: st } = await supabase.from('cbc_student_assessments').select('*').limit(5);
  console.log('cbc_student_assessments count:', st?.length, 'Sample:', st?.[0]);

  const { data: proj } = await supabase.from('cbc_project_submissions').select('*').limit(5);
  console.log('cbc_project_submissions count:', proj?.length, 'Sample:', proj?.[0]);
}

checkData();
