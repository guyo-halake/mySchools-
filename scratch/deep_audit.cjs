const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://vomsaqkhtturzqfuwxsn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDIxNjgsImV4cCI6MjA5MTI3ODE2OH0.3M2p0SWKO51yjkGtLnCyJOFsKiAwC__BnWoe_jZlPI8'
);

async function run() {
  // 1. cbc_project_submissions - full schema + samples
  console.log('\n===== cbc_project_submissions =====');
  const { data: subs } = await supabase.from('cbc_project_submissions').select('*').limit(5);
  if (subs?.length) {
    console.log('Columns:', Object.keys(subs[0]).join(', '));
    subs.forEach((r, i) => console.log(`Row${i+1}:`, JSON.stringify(r)));
  }

  // 2. cbc_projects
  console.log('\n===== cbc_projects =====');
  const { data: projs } = await supabase.from('cbc_projects').select('*');
  if (projs?.length) {
    console.log('Columns:', Object.keys(projs[0]).join(', '));
    projs.forEach((r, i) => console.log(`Row${i+1}:`, JSON.stringify(r)));
  }

  // 3. cbc_strands
  console.log('\n===== cbc_strands (sample 3) =====');
  const { data: strands } = await supabase.from('cbc_strands').select('*').limit(3);
  if (strands?.length) {
    console.log('Columns:', Object.keys(strands[0]).join(', '));
    strands.forEach((r, i) => console.log(`Row${i+1}:`, JSON.stringify(r)));
  }

  // 4. cbc_sub_strands
  console.log('\n===== cbc_sub_strands (sample 3) =====');
  const { data: sub_strands } = await supabase.from('cbc_sub_strands').select('*').limit(3);
  if (sub_strands?.length) {
    console.log('Columns:', Object.keys(sub_strands[0]).join(', '));
    sub_strands.forEach((r, i) => console.log(`Row${i+1}:`, JSON.stringify(r)));
  }

  // 5. cbc_student_assessments (what does it look like even if empty)
  console.log('\n===== cbc_student_assessments (schema check) =====');
  const { data: sa, error: saErr } = await supabase.from('cbc_student_assessments').select('*').limit(1);
  console.log('Error:', saErr?.message || 'none');
  console.log('Data:', sa);

  // 6. classroom_sessions (105 rows - what is this?)
  console.log('\n===== classroom_sessions (sample 3) =====');
  const { data: sessions } = await supabase.from('classroom_sessions').select('*').limit(3);
  if (sessions?.length) {
    console.log('Columns:', Object.keys(sessions[0]).join(', '));
    sessions.forEach((r, i) => console.log(`Row${i+1}:`, JSON.stringify(r)));
  }

  // 7. Count submissions per project + per student
  console.log('\n===== cbc_project_submissions STATS =====');
  const { data: allSubs } = await supabase.from('cbc_project_submissions').select('*');
  if (allSubs) {
    const uniqueStudents = new Set(allSubs.map(s => s.student_id)).size;
    const uniqueProjects = new Set(allSubs.map(s => s.project_id || s.cbc_project_id)).size;
    const ratings = {};
    allSubs.forEach(s => {
      const r = s.rating || s.score || s.grade || s.performance_level || s.level || 'unknown';
      ratings[r] = (ratings[r]||0)+1;
    });
    console.log('Total submissions:', allSubs.length);
    console.log('Unique students:', uniqueStudents);
    console.log('Unique projects:', uniqueProjects);
    console.log('Ratings/grades distribution:', ratings);
    // Show all field names with sample values
    if (allSubs[0]) {
      console.log('\nAll fields with sample values:');
      Object.entries(allSubs[0]).forEach(([k,v]) => console.log(`  ${k} = ${JSON.stringify(v)}`));
    }
  }

  // 8. exams - full list
  console.log('\n===== exams (all) =====');
  const { data: exams } = await supabase.from('exams').select('*');
  if (exams?.length) {
    console.log('Columns:', Object.keys(exams[0]).join(', '));
    exams.slice(0,5).forEach((r, i) => console.log(`Row${i+1}:`, JSON.stringify(r)));
  }

  // 9. terms - full list sorted by current
  console.log('\n===== terms =====');
  const { data: terms } = await supabase.from('terms').select('*').order('start_date', { ascending: false }).limit(10);
  terms?.forEach(t => console.log(`  id=${t.id} | ${t.name} ${t.year||''} | current=${t.is_current} | start=${t.start_date}`));
}

run().catch(console.error);
