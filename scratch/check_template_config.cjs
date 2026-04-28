const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTemplate() {
  try {
    const { data: templates, error } = await supabase
      .from('templates')
      .select('*')
      .eq('key', 'TIMETABLE_CLASSES')
      .eq('archived', false);

    if (error) throw error;

    if (!templates || templates.length === 0) {
      console.log('❌ No TIMETABLE_CLASSES template found');
      return;
    }

    const template = templates[0];
    const config = template.config || {};

    console.log('\n✓ TIMETABLE_CLASSES Template Found');
    console.log('─'.repeat(50));
    
    console.log('\n📍 Basics:');
    console.log(`  School: ${template.school_id.substring(0, 8)}...`);
    console.log(`  Status: ${config.releaseState || 'UNKNOWN'}`);
    console.log(`  Updated: ${template.updated_at}`);

    console.log('\n⏰ Times:');
    console.log(`  School: ${config.schoolStartTime} → ${config.schoolEndTime}`);
    console.log(`  Classes: ${config.classStartTime} → ${config.classEndTime}`);
    console.log(`  Period: ${config.periodMinutes} minutes`);

    console.log('\n🔔 Breaks (${config.breaks?.length || 0}):');
    if (Array.isArray(config.breaks) && config.breaks.length > 0) {
      config.breaks.forEach((brk) => {
        console.log(`  • "${brk.label}" - After period ${brk.afterPeriods} for ${brk.durationMinutes} min`);
      });
    } else {
      console.log('  (none)');
    }

    console.log('\n📝 Custom Items (${config.customEntries?.length || 0}):');
    if (Array.isArray(config.customEntries) && config.customEntries.length > 0) {
      config.customEntries.forEach((item) => {
        console.log(`  • "${item.name}" [${item.type}] ${item.startTime}-${item.endTime}`);
      });
    } else {
      console.log('  (none)');
    }

    console.log('\n⚙️ Settings:');
    console.log(`  Default Label: ${config.defaultClassLabel || 'CLASS'}`);
    console.log(`  Room Prefix: ${config.roomPrefix || 'Room'}`);
    console.log(`  Enforce Live Slot Alignment: ${config.enforceLiveSlotAlignment ? '✓' : '✗'}`);
    console.log(`  Subject Selection Limit: ${config.subjectSelectionLimit || 'N/A'}`);
    console.log(`  Fallback Streams: ${config.fallbackStreamCount || 'N/A'}`);
    console.log(`  Prefer Class Teacher: ${config.preferClassTeacherStreams ? '✓' : '✗'}`);

    console.log('\n' + '─'.repeat(50));
    console.log('✅ Template config is in database\n');

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkTemplate();
