const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateTeacherPermissions() {
  try {
    const { data, error } = await supabase
      .from('template_permissions')
      .update({ can_edit: true })
      .eq('role', 'TEACHER')
      .eq('template_key', 'TIMETABLE_CLASSES')
      .select();

    if (error) throw error;

    console.log('✓ Updated TEACHER permissions to can_edit=true');
    console.log(`  Rows updated: ${data?.length || 0}`);
    
    // Verify
    const { data: verify, error: verifyErr } = await supabase
      .from('template_permissions')
      .select('role, template_key, can_edit')
      .eq('role', 'TEACHER')
      .eq('template_key', 'TIMETABLE_CLASSES');
    
    if (verifyErr) throw verifyErr;
    console.log('\nVerification:');
    verify?.forEach(row => {
      console.log(`  ${row.role} - ${row.template_key}: can_edit=${row.can_edit}`);
    });

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

updateTeacherPermissions();
