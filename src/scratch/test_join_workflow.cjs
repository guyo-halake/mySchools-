const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testJoin() {
  const { data, error } = await supabase
    .from('results_workflow')
    .select('*, student:students!results_workflow_student_id_fkey(id, parent_id, profile:profiles!students_id_fkey(full_name))')
    .limit(1);

  if (error) {
    console.error('Join Error:', error);
  } else {
    console.log('Join Success Sample:', JSON.stringify(data[0], null, 2));
  }
}

testJoin();
