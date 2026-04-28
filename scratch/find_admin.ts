import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vomsaqkhtturzqfuwxsn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDIxNjgsImV4cCI6MjA5MTI3ODE2OH0.3M2p0SWKO51yjkGtLnCyJOFsKiAwC__BnWoe_jZlPI8'
);

async function findGiakanjaAdmin() {
  console.log('--- Searching for Giakanja Admin/Principal ---');
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'ADMIN');

  if (error) { console.error(error); return; }
  
  const giakanjaAdmin = profiles.filter(p => p.email?.includes('giakanja') || p.full_name?.includes('Principal'));
  console.log('Admins found:', JSON.stringify(giakanjaAdmin, null, 2));
}

findGiakanjaAdmin();
