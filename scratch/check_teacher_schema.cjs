const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://vomsaqkhtturzqfuwxsn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcwMjE2OCwiZXhwIjoyMDkxMjc4MTY4fQ.lGkYaJ5rZQ9pnBLqn3YZMi5c5IJ_mFf-NhniKSi73IY'
);

async function main() {
  // Check cbc_projects columns
  const { data: proj } = await supabase.from('cbc_projects').select('*').limit(1);
  console.log('cbc_projects sample:', JSON.stringify(proj?.[0], null, 2));

  // Check attendance table
  const { data: att, error: attErr } = await supabase.from('attendance').select('*').limit(1);
  if (attErr) console.log('attendance error:', attErr.message);
  else console.log('attendance sample:', JSON.stringify(att?.[0], null, 2));

  // Check cbc_student_assessments
  const { data: assess } = await supabase.from('cbc_student_assessments').select('*').limit(1);
  console.log('cbc_student_assessments sample:', JSON.stringify(assess?.[0], null, 2));
  
  // Check learning_areas
  const { data: la } = await supabase.from('learning_areas').select('*').limit(3);
  console.log('learning_areas:', JSON.stringify(la, null, 2));
}
main();
