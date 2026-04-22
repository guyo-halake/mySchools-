import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vomsaqkhtturzqfuwxsn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDIxNjgsImV4cCI6MjA5MTI3ODE2OH0.3M2p0SWKO51yjkGtLnCyJOFsKiAwC__BnWoe_jZlPI8'
);

async function checkProfiles() {
  console.log('--- Checking Profiles Table Schema ---');
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  if (error) { console.error(error); return; }
  console.log('Columns:', Object.keys(data[0]));
}

checkProfiles();
