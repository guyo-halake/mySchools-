const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://vomsaqkhtturzqfuwxsn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDIxNjgsImV4cCI6MjA5MTI3ODE2OH0.3M2p0SWKO51yjkGtLnCyJOFsKiAwC__BnWoe_jZlPI8'
);

async function run() {
  // Check available relationships for a single student to build a 360 profile
  console.log('Checking student relations for 360 view...');
  const { data: student } = await supabase.from('students').select(`
    id, adm_no, 
    profile:profiles!students_id_fkey(full_name),
    attendance(count),
    disciplinary_records(count),
    cbc_project_submissions(count)
  `).limit(1).maybeSingle();
  
  console.log(JSON.stringify(student, null, 2));
}

run().catch(console.error);
