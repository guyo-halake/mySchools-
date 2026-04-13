const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function traceUserAndTemplate() {
  try {
    console.log('\n🔍 USER & TEMPLATE SCHOOL TRACE\n');
    console.log('═'.repeat(70));

    // Get the user who's logged in (from session)
    const { data: { user: authUser } } = await supabase.auth.getUser();
    console.log('\nAuthenticated User:');
    console.log(`  ID: ${authUser?.id}`);
    console.log(`  Email: ${authUser?.email}`);

    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('*, schools(id, name)')
      .eq('id', authUser.id)
      .limit(1)
      .single();

    if (profile) {
      console.log(`  School ID: ${profile.school_id}`);
      console.log(`  School Name: ${profile.schools?.name}`);
      console.log(`  Role: ${profile.role}`);
    }

    // Get template queried by Timetable.tsx (no school filter in query!)
    console.log('\nTEMPLATE QUERY (as Timetable.tsx would do it):');
    const { data: templates } = await supabase
      .from('templates')
      .select('*')
      .eq('key', 'TIMETABLE_CLASSES')
      .eq('archived', false)
      .limit(5);  // Get all, not just 1

    if (templates && templates.length > 0) {
      console.log(`  Found ${templates.length} template(s) for TIMETABLE_CLASSES:`);
      templates.forEach((t, idx) => {
        const schoolMatch = t.school_id === profile?.school_id ? ' ✓ USER SCHOOL' : ' ❌ DIFFERENT SCHOOL';
        console.log(`  ${idx + 1}. School: ${t.school_id}${schoolMatch}`);
        console.log(`     Times: ${t.config?.schoolStartTime} → ${t.config?.schoolEndTime}`);
      });
    }

    console.log('\n' + '═'.repeat(70));
    console.log('\n🔴 ROOT CAUSE:');
    console.log('   Template query is NOT filtered by user.school_id');
    console.log('   So Timetable might be loading template from WRONG school');
    console.log('   (or getting the first one if multiple exist)\n');

  } catch (err) {
    console.error('Error:', err.message);
  }
}

traceUserAndTemplate();
