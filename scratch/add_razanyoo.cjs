const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://vomsaqkhtturzqfuwxsn.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDIxNjgsImV4cCI6MjA5MTI3ODE2OH0.3M2p0SWKO51yjkGtLnCyJOFsKiAwC__BnWoe_jZlPI8";
const supabase = createClient(supabaseUrl, supabaseKey);

async function addStudent() {
  try {
    // 1. Get School
    const { data: schools } = await supabase.from('schools').select('id').limit(1);
    if (!schools || schools.length === 0) throw new Error('No school found');
    const schoolId = schools[0].id;

    // 2. Get Grade 6 West Stream
    const { data: streams } = await supabase.from('streams')
      .select('id, classes!inner(name)')
      .eq('name', 'West')
      .eq('classes.name', 'Grade 6')
      .single();

    if (!streams) throw new Error('Grade 6 West stream not found');
    const streamId = streams.id;

    // 3. Check if Razanyoo already exists to avoid duplicates
    const { data: existingProfile } = await supabase.from('profiles')
      .select('id')
      .eq('full_name', 'Razanyoo')
      .single();

    let profileId;
    if (existingProfile) {
      profileId = existingProfile.id;
      console.log('Razanyoo profile already exists, using existing ID:', profileId);
    } else {
      // Create Profile
      const { data: profile, error: pErr } = await supabase.from('profiles').insert({
        full_name: 'Razanyoo',
        role: 'STUDENT',
        email: 'guyohalakeofficial@gmail.com'
      }).select().single();

      if (pErr) throw pErr;
      profileId = profile.id;
    }

    // 4. Create Student
    const { data: student, error: sErr } = await supabase.from('students').insert({
      id: profileId,
      school_id: schoolId,
      stream_id: streamId,
      adm_no: 'RAZ-2026-001'
    }).select().single();

    if (sErr && sErr.code !== '23505') throw sErr; // Ignore unique constraint if already exists

    console.log('Successfully added/verified student Razanyoo in Grade 6 West');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

addStudent();
