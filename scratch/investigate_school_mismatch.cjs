const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigateSchoolMismatch() {
  try {
    console.log('\n🔍 SCHOOL MISMATCH INVESTIGATION\n');
    console.log('═'.repeat(70));

    // Get template
    const { data: templates } = await supabase
      .from('templates')
      .select('*')
      .eq('key', 'TIMETABLE_CLASSES')
      .limit(1);

    const template = templates[0];
    console.log(`\nTemplate:
  School ID: ${template.school_id}
  School Relationship: ${template.school_id}`);

    // Get the 40 physical entries
    const { data: all40 } = await supabase
      .from('physical_timetable_entries')
      .select('*')
      .limit(50);

    console.log(`\nPhysical Entries (${all40?.length || 0} total):`);
    if (all40 && all40.length > 0) {
      const bySchool = {};
      all40.forEach((e) => {
        if (!bySchool[e.school_id]) bySchool[e.school_id] = 0;
        bySchool[e.school_id]++;
      });

      Object.entries(bySchool).forEach(([schoolId, count]) => {
        console.log(`  School ${schoolId}: ${count} entries`);
        const match = schoolId === template.school_id ? '✓ MATCHES TEMPLATE' : '❌ DIFFERENT';
        console.log(`    ${match}`);
      });
    }

    // Get all schools in the system to understand the setup
    console.log(`\nAll Schools in System:`);
    const { data: schools } = await supabase
      .from('schools')
      .select('id, name')
      .limit(10);

    if (schools && schools.length > 0) {
      schools.forEach((s) => {
        const isTemplate = s.id === template.school_id ? ' (TEMPLATE SCHOOL)' : '';
        console.log(`  ${s.id}: ${s.name}${isTemplate}`);
      });
    }

    console.log('\n' + '═'.repeat(70));
    console.log('\n🔴 PROBLEM: Physical timetable entries are in WRONG school!');
    console.log('\nSolution: Need to move/recreate entries in correct school OR');
    console.log('          need to check if user is querying wrong school\n');

  } catch (err) {
    console.error('Error:', err.message);
  }
}

investigateSchoolMismatch();
