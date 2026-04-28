const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPhysicalEntries() {
  try {
    console.log('\n🔍 Checking Physical Timetable Entries...\n');

    // Get ALL physical entries for all teachers
    const { data: allEntries, error: err1 } = await supabase
      .from('physical_timetable_entries')
      .select('*')
      .limit(100);

    if (err1) throw err1;

    console.log(`Total physical entries in DB: ${allEntries?.length || 0}`);

    if (allEntries && allEntries.length > 0) {
      console.log('\n📊 Sample entries:');
      
      // Group by teacher
      const byTeacher = {};
      allEntries.forEach((e) => {
        if (!byTeacher[e.teacher_id]) byTeacher[e.teacher_id] = [];
        byTeacher[e.teacher_id].push(e);
      });

      Object.entries(byTeacher).forEach(([teacherId, entries]) => {
        console.log(`\n  Teacher: ${teacherId}`);
        console.log(`    Total: ${entries.length} entries`);
        
        const times = entries.slice(0, 3).map((e) => `${e.day_of_week} ${e.start_time}-${e.end_time}`);
        console.log(`    Sample times: ${times.join(' | ')}`);
        
        // Check what the time ranges are
        const startTimes = [...new Set(entries.map((e) => e.start_time))].sort();
        console.log(`    All start times: ${startTimes.join(', ')}`);
      });
    } else {
      console.log('\n⚠️  NO physical entries exist in database');
      console.log('\nThis means:');
      console.log('  1. Physical timetable shows empty slots by default');
      console.log('  2. seedPhysicalEntries() must have failed or not been called properly');
      console.log('  3. Timetable displays with DEFAULT_TIMETABLE_CONFIG hardcoded values');
    }

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkPhysicalEntries();
