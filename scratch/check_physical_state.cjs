const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPhysicalState() {
  try {
    console.log('\n🔍 Physical Entries State Check\n');
    
    // Get ALL without any filter
    const { data: all } = await supabase.from('physical_timetable_entries').select('*').limit(2);
    console.log(`Total entries (no filter): ${all?.length || 0}`);
    if (all && all.length > 0) {
      const entry = all[0];
      console.log(`Sample entry school_id: ${entry.school_id}`);
    }

    // Get template to know which school_id to filter by
    const { data: templates } = await supabase
      .from('templates')
      .select('*')
      .eq('key', 'TIMETABLE_CLASSES')
      .limit(1);

    if (!templates || !templates[0]) {
      console.error('No template');
      return;
    }

    const schoolId = templates[0].school_id;
    console.log(`\nTemplate school_id: ${schoolId}`);

    // Filter by template's school
    const { data: bySchool } = await supabase
      .from('physical_timetable_entries')
      .select('*')
      .eq('school_id', schoolId)
      .limit(5);

    console.log(`Entries for template school: ${bySchool?.length || 0}`);
    if (bySchool && bySchool.length > 0) {
      console.log(`  Sample times: ${bySchool.slice(0, 2).map((e) => `${e.start_time}-${e.end_time}`).join(', ')}`);
    }

  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkPhysicalState();
