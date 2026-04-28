const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://vomsaqkhtturzqfuwxsn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDIxNjgsImV4cCI6MjA5MTI3ODE2OH0.3M2p0SWKO51yjkGtLnCyJOFsKiAwC__BnWoe_jZlPI8');

async function unlockDb() {
  const { data, error } = await supabase.from('school_result_controls').update({ 
    enforce_exam_window: false, 
    enforce_active_term: false 
  }).match({ school_id: 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5' });
  
  if (error) console.error('Unlock Failed:', error);
  else console.log('✅ Database Unlocked: Enforcement Disabled.');
}

unlockDb();
