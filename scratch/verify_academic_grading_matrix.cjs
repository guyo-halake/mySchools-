const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://vomsaqkhtturzqfuwxsn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDIxNjgsImV4cCI6MjA5MTI3ODE2OH0.3M2p0SWKO51yjkGtLnCyJOFsKiAwC__BnWoe_jZlPI8";
const GIAKANJA_ID = "f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('Verifying resolved PostgREST query:');
  
  // Test query on cbc_student_assessments
  const { data: assessments, error: aErr } = await supabase
    .from('cbc_student_assessments')
    .select('*, learning_area:learning_areas(name, category), cbc_strands(name), cbc_sub_strands(name)')
    .eq('school_id', GIAKANJA_ID)
    .limit(5);

  if (aErr) {
    console.error('CBC Assessments Query Error:', aErr);
  } else {
    console.log('✓ CBC Assessments query succeeded. Returned records:', assessments.length);
  }

  // Test query with disambiliated profiles relation
  const { data: workflow, error: wErr } = await supabase
    .from('results_workflow')
    .select('*, student:students(id, adm_no, profile:profiles!students_id_fkey(full_name))')
    .eq('school_id', GIAKANJA_ID)
    .limit(5);

  if (wErr) {
    console.error('Workflow Query Error:', wErr);
  } else {
    console.log('✓ Disambiliated Profiles workflow query succeeded. Returned records:', workflow.length);
  }
}

main().catch(console.error);
