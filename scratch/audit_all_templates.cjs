const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditTemplateQueries() {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('║  🎯 FINAL ROOT CAUSE DIAGNOSIS                                        ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

    // Get all TIMETABLE_CLASSES templates
    const { data: allTemplates } = await supabase
      .from('templates')
      .select('id, key, school_id, config, active, archived')
      .eq('key', 'TIMETABLE_CLASSES');

    console.log('📋 ALL TIMETABLE_CLASSES Templates in System:');
    console.log('─'.repeat(75));
    
    if (!allTemplates || allTemplates.length === 0) {
      console.log('  ❌ NO TEMPLATES FOUND');
      return;
    }

    const schools = {};
    allTemplates.forEach((t) => {
      if (!schools[t.school_id]) schools[t.school_id] = [];
      schools[t.school_id].push(t);
    });

    Object.entries(schools).forEach(([schoolId, templates]) => {
      console.log(`\n🏫 School: ${schoolId}`);
      templates.forEach((t, idx) => {
        console.log(`   ${idx + 1}. Template ID: ${t.id.substring(0, 8)}...`);
        console.log(`      Active: ${t.active} | Archived: ${t.archived}`);
        console.log(`      Times: ${t.config?.schoolStartTime} → ${t.config?.schoolEndTime}`);
        console.log(`      Period: ${t.config?.periodMinutes} min`);
        console.log(`      Breaks: ${t.config?.breaks?.length || 0}`);
        console.log(`      Custom: ${t.config?.customEntries?.length || 0}`);
      });
    });

    console.log('\n' + '─'.repeat(75));
    console.log('\n⚠️  CRITICAL ISSUE FOUND:\n');

    const giakanja = Object.entries(schools).find(([id]) => id === 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5');
    const alliance = Object.entries(schools).find(([id]) => id === '4eb8b0f6-90be-44d5-b220-a7995cc3c87b');

    if (giakanja) {
      const cfg = giakanja[1][0].config;
      console.log(`✓ Giakanja school HAS template:`);
      console.log(`  Times: ${cfg.schoolStartTime} → ${cfg.schoolEndTime} (${cfg.periodMinutes} min, ${cfg.breaks?.length} breaks)`);
    } else {
      console.log(`❌ Giakanja school has NO template!`);
    }

    if (alliance) {
      const cfg = alliance[1][0].config;
      console.log(`\n✓ Alliance school HAS template (UPDATED WITH TEST DATA):`);
      console.log(`  Times: ${cfg.schoolStartTime} → ${cfg.schoolEndTime} (${cfg.periodMinutes} min, ${cfg.breaks?.length} breaks)`);
    }

    console.log('\n💡 THE PROBLEM:\n   User is from Giakanja school');
    console.log('   Timetable.tsx template query MIGHT be loading Alliance template');
    console.log('   OR Giakanja template exists but is not being updated correctly\n');

    if (!giakanja && alliance) {
      console.log('🔴 ACTION NEEDED:\n   Copy TEST template from Alliance to Giakanja school\n');
    }

  } catch (err) {
    console.error('Error:', err.message);
  }
}

auditTemplateQueries();
