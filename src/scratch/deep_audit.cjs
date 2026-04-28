const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function deepAudit() {
  console.log('--- STARTING DEEP INSTITUTIONAL AUDIT ---');

  // 1. Audit Profiles
  console.log('\n[1] AUDITING TEACHER PROFILES:');
  const { data: teachers, error: tErr } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('role', 'TEACHER');

  if (tErr) console.error('Profile Audit Error:', tErr);
  else console.log(`Found ${teachers.length} teachers.`);

  // 2. Audit Streams
  console.log('\n[2] AUDITING STREAMS & CLASS TEACHER ASSIGNMENTS:');
  const { data: streams, error: sErr } = await supabase
    .from('streams')
    .select(`
      id, 
      name, 
      class_teacher_id,
      class:classes(name)
    `);

  if (sErr) {
    console.error('Stream Audit Error:', sErr);
  } else {
    console.log(`Found ${streams.length} streams.`);
    const assignments = streams.map(s => ({
      stream: `${s.class?.name || 'Unknown'} ${s.name}`,
      teacher_id: s.class_teacher_id
    }));
    console.log('Current Assignments:', assignments);
  }

  // 3. Cross-Reference: Who is a Class Teacher?
  console.log('\n[3] CROSS-REFERENCING TEACHERS WITH ASSIGNMENTS:');
  const assignedTeacherIds = new Set(streams.map(s => s.class_teacher_id).filter(Boolean));
  
  const auditResults = teachers.map(t => {
    const isAssigned = assignedTeacherIds.has(t.id);
    const assignedTo = streams
      .filter(s => s.class_teacher_id === t.id)
      .map(s => `${s.class?.name || 'Unknown'} ${s.name}`)
      .join(', ');

    return {
      name: t.full_name,
      email: t.email,
      is_class_teacher: isAssigned,
      assigned_to: assignedTo || 'NONE'
    };
  });

  console.table(auditResults);

  // 4. Check for Foreign Key issues
  console.log('\n[4] CHECKING RELATIONSHIP INTEGRITY:');
  // Let's try the exact query used in AuthContext.tsx
  const testTeacher = teachers[0];
  if (testTeacher) {
    console.log(`Testing relationship query for: ${testTeacher.full_name}`);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, class_streams:streams!streams_class_teacher_id_fkey(id)')
      .eq('id', testTeacher.id)
      .single();

    if (error) {
      console.error('Relation Query FAILED:', error.message);
      console.log('HINT: This usually means the foreign key constraint "streams_class_teacher_id_fkey" does not exist or is named differently.');
    } else {
      console.log('Relation Query SUCCESS:', data);
    }
  }

  console.log('\n--- AUDIT COMPLETE ---');
}

deepAudit();
