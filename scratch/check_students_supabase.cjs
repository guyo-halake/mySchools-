const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStudents() {
  // 1. Get Giakanja School ID
  const { data: schools, error: sErr } = await supabase
    .from('schools')
    .select('id')
    .eq('subdomain', 'giakanja');
  
  if (sErr || !schools?.length) {
    console.error('Giakanja not found:', sErr);
    return;
  }
  const schoolId = schools[0].id;

  // 2. Fetch students for Form 4H (or all to check format)
  const { data: students, error: pErr } = await supabase
    .from('students')
    .select('*, profiles!students_id_fkey(full_name), streams(name, classes(name))')
    .eq('school_id', schoolId)
    .order('adm_no', { ascending: true });

  if (pErr) {
    console.error('Students fetch error:', pErr);
    return;
  }

  console.log('--- DATABASE STUDENTS (Giakanja) ---');
  console.log('Total Count:', students.length);
  students.slice(0, 15).forEach(s => {
    const stream = s.streams?.name || '';
    const className = s.streams?.classes?.name || '';
    console.log(`[${className} ${stream}] ADM: "${s.adm_no}" - Name: ${s.profiles?.full_name}`);
  });
}

checkStudents();
