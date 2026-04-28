import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vomsaqkhtturzqfuwxsn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDIxNjgsImV4cCI6MjA5MTI3ODE2OH0.3M2p0SWKO51yjkGtLnCyJOFsKiAwC__BnWoe_jZlPI8'
);

async function listRazanyoos() {
  console.log('--- Listing all Razanyoos ---');
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, password, school_id')
    .ilike('full_name', '%Razanyoo%');

  if (!profiles || profiles.length === 0) {
    console.log('No one found.');
    return;
  }

  for (const p of profiles) {
    const { data: s } = await supabase.from('students').select('adm_no').eq('id', p.id).maybeSingle();
    const { data: school } = await supabase.from('schools').select('name').eq('id', p.school_id).maybeSingle();
    
    console.log('-------------------');
    console.log('Name:', p.full_name);
    console.log('Email:', p.email);
    console.log('Pass:', p.password);
    console.log('ADM:', s?.adm_no);
    console.log('School:', school?.name);
  }
}

listRazanyoos();
