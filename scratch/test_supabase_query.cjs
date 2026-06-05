const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://vomsaqkhtturzqfuwxsn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDIxNjgsImV4cCI6MjA5MTI3ODE2OH0.3M2p0SWKO51yjkGtLnCyJOFsKiAwC__BnWoe_jZlPI8";
const GIAKANJA_ID = "f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('Querying Supabase cbc_student_assessments...');
  const { data, error } = await supabase
    .from('cbc_student_assessments')
    .select('*, learning_area:learning_areas(name, category), cbc_strands(name), cbc_sub_strands(name)')
    .eq('school_id', GIAKANJA_ID);

  if (error) {
    console.error('Supabase Query Error:', error);
    return;
  }

  console.log('Query returned length:', data.length);
  if (data.length > 0) {
    console.log('First assessment object sample:', JSON.stringify(data[0], null, 2));
  }
}

main().catch(console.error);
