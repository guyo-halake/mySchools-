const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function auditTeacher() {
  const email = 'teacher@example.com'; // Adjust if needed
  
  // 1. Get Teacher Profile
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'TEACHER')
    .limit(10);
    
  if (pErr) {
    console.error('Profile Fetch Error:', pErr);
    return;
  }

  console.log('TEACHERS FOUND:', profile.map(p => ({ id: p.id, name: p.full_name, email: p.email })));

  if (profile.length > 0) {
    const teacherId = profile[0].id;
    console.log(`Auditing teacher: ${profile[0].full_name} (${teacherId})`);

    // 2. Check Streams
    const { data: streams, error: sErr } = await supabase
      .from('streams')
      .select('*')
      .eq('class_teacher_id', teacherId);

    if (sErr) {
      console.error('Stream Fetch Error:', sErr);
    } else {
      console.log('ASSIGNED STREAMS:', streams);
    }
    
    // 3. Check all streams to see who IS a class teacher
    const { data: allStreams } = await supabase.from('streams').select('id, name, class_teacher_id');
    console.log('ALL STREAMS:', allStreams);
  }
}

auditTeacher();
