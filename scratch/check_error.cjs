const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://vomsaqkhtturzqfuwxsn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDIxNjgsImV4cCI6MjA5MTI3ODE2OH0.3M2p0SWKO51yjkGtLnCyJOFsKiAwC__BnWoe_jZlPI8'
);

async function run() {
  const p = await supabase.from('cbc_projects').select('id, term_id').limit(1);
  console.log("cbc_projects err:", p.error);
  
  const pt = await supabase.from('cbc_projects').select('id, term:terms(name, year)').limit(1);
  console.log("cbc_projects term err:", pt.error);
  
  const er = await supabase.from('exam_results').select('id, stream_id').limit(1);
  console.log("exam_results err:", er.error);
  
  const ers = await supabase.from('exam_results').select('*, stream:streams(id)').limit(1);
  console.log("exam_results stream err:", ers.error);
}
run();
