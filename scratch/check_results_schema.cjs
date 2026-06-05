const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://vomsaqkhtturzqfuwxsn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcwMjE2OCwiZXhwIjoyMDkxMjc4MTY4fQ.lGkYaJ5rZQ9pnBLqn3YZMi5c5IJ_mFf-NhniKSi73IY'
);

async function main() {
  const { data: results } = await supabase.from('exam_results').select('*, subject:subjects(name)').limit(3);
  console.log('exam_results:', JSON.stringify(results, null, 2));

  const { data: cbc_assess } = await supabase.from('cbc_student_assessments').select('*, learning_area:learning_areas(name)').limit(3);
  console.log('cbc_student_assessments:', JSON.stringify(cbc_assess, null, 2));

  const { data: la } = await supabase.from('learning_areas').select('*').limit(3);
  console.log('learning_areas:', JSON.stringify(la, null, 2));
}
main();
