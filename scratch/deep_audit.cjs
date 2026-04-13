const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deepAudit() {
  try {
    console.log('🔍 DEEP TIMETABLE TEMPLATE AUDIT\n');
    console.log('═'.repeat(70));

    // 1. Check templates table
    console.log('\n1️⃣ TEMPLATES TABLE');
    console.log('─'.repeat(70));
    
    const { data: allTemplates, error: templatesErr } = await supabase
      .from('templates')
      .select('id, school_id, key, name, active, archived, created_at, updated_at, config');

    if (templatesErr) throw templatesErr;

    console.log(`   Total templates: ${allTemplates?.length || 0}\n`);
    
    allTemplates?.forEach((t, idx) => {
      const cfg = t.config || {};
      console.log(`   [${idx + 1}] ${t.key} (${t.name})`);
      console.log(`       ID: ${t.id}`);
      console.log(`       School: ${t.school_id.substring(0, 8)}...`);
      console.log(`       Active: ${t.active}, Archived: ${t.archived}`);
      console.log(`       Updated: ${t.updated_at}`);
      
      if (t.key === 'TIMETABLE_CLASSES') {
        console.log(`       ⏰ Times: ${cfg.schoolStartTime} → ${cfg.schoolEndTime}`);
        console.log(`       📚 Classes: ${cfg.classStartTime} → ${cfg.classEndTime}`);
        console.log(`       ⏱️  Period: ${cfg.periodMinutes} min`);
        console.log(`       🔔 Breaks: ${cfg.breaks?.length || 0}`);
        console.log(`       📝 Custom: ${cfg.customEntries?.length || 0}`);
        console.log(`       🔐 Release: ${cfg.releaseState || 'UNKNOWN'}`);
      }
      console.log();
    });

    // 2. Check physical_timetable_entries
    console.log('\n2️⃣ PHYSICAL_TIMETABLE_ENTRIES TABLE');
    console.log('─'.repeat(70));
    
    const { data: physicalEntries, error: physicalErr } = await supabase
      .from('physical_timetable_entries')
      .select('id, school_id, teacher_id, day_of_week, start_time, end_time, class_label')
      .limit(20);

    if (physicalErr) throw physicalErr;

    console.log(`   Total entries (first 20): ${physicalEntries?.length || 0}\n`);
    
    if (physicalEntries && physicalEntries.length > 0) {
      const timeRanges = new Set();
      physicalEntries.forEach(e => {
        timeRanges.add(`${e.start_time}-${e.end_time}`);
      });
      
      console.log(`   Unique time slots: ${timeRanges.size}`);
      Array.from(timeRanges).forEach(tr => {
        const entries = physicalEntries.filter(e => `${e.start_time}-${e.end_time}` === tr);
        console.log(`     • ${tr}: ${entries.length} entries (days: ${new Set(entries.map(e => e.day_of_week)).size})`);
      });
    }

    // 3. Check live_timetable_entries
    console.log('\n3️⃣ LIVE_TIMETABLE_ENTRIES TABLE');
    console.log('─'.repeat(70));
    
    const { data: liveEntries, error: liveErr } = await supabase
      .from('live_timetable_entries')
      .select('id, template_key, template_slot_start, template_slot_end, start_at, end_at')
      .limit(10);

    if (liveErr) throw liveErr;

    console.log(`   Total entries (first 10): ${liveEntries?.length || 0}\n`);
    
    if (liveEntries && liveEntries.length > 0) {
      liveEntries.forEach((e, idx) => {
        console.log(`   [${idx + 1}] Template: ${e.template_key}`);
        console.log(`       Slot: ${e.template_slot_start} → ${e.template_slot_end}`);
        console.log(`       Actual: ${e.start_at ? new Date(e.start_at).toLocaleString('en-GB') : 'N/A'}`);
      });
    }

    // 4. Get TTConfig for detailed review
    console.log('\n4️⃣ TIMETABLE_CLASSES CONFIG DEEP DIVE');
    console.log('─'.repeat(70));
    
    const { data: ttTemplates } = await supabase
      .from('templates')
      .select('*')
      .eq('key', 'TIMETABLE_CLASSES')
      .limit(10);

    if (ttTemplates && ttTemplates.length > 0) {
      ttTemplates.forEach((t, idx) => {
        console.log(`\n   Template ${idx + 1}:`);
        const cfg = t.config || {};
        
        console.log(`   Timing:`);
        console.log(`     schoolStartTime: "${cfg.schoolStartTime}"`);
        console.log(`     schoolEndTime: "${cfg.schoolEndTime}"`);
        console.log(`     classStartTime: "${cfg.classStartTime}"`);
        console.log(`     classEndTime: "${cfg.classEndTime}"`);
        console.log(`     periodMinutes: ${cfg.periodMinutes}`);
        
        console.log(`   Breaks (${cfg.breaks?.length || 0}):`);
        if (Array.isArray(cfg.breaks)) {
          cfg.breaks.forEach((b, i) => {
            console.log(`     [${i+1}] "${b.label}" - after period ${b.afterPeriods} for ${b.durationMinutes} min`);
          });
        } else {
          console.log(`     ⚠️  NOT AN ARRAY: ${typeof cfg.breaks}`);
        }
        
        console.log(`   Custom Entries (${cfg.customEntries?.length || 0}):`);
        if (Array.isArray(cfg.customEntries)) {
          cfg.customEntries.forEach((c, i) => {
            console.log(`     [${i+1}] "${c.name}" [${c.type}] ${c.startTime}-${c.endTime}`);
          });
        } else if (cfg.customEntries) {
          console.log(`     ⚠️  NOT AN ARRAY: ${typeof cfg.customEntries}`);
        }
        
        console.log(`   Other:`);
        console.log(`     dayOrder: ${JSON.stringify(cfg.dayOrder)}`);
        console.log(`     defaultClassLabel: "${cfg.defaultClassLabel}"`);
        console.log(`     roomPrefix: "${cfg.roomPrefix}"`);
        console.log(`     enforceLiveSlotAlignment: ${cfg.enforceLiveSlotAlignment}`);
        console.log(`     releaseState: "${cfg.releaseState}"`);
      });
    }

    // 5. Check for multiple school_ids
    console.log('\n5️⃣ SCHOOL DISTRIBUTION');
    console.log('─'.repeat(70));
    
    const schools = new Set();
    allTemplates?.forEach(t => schools.add(t.school_id));
    
    console.log(`   Unique schools: ${schools.size}`);
    schools.forEach(schoolId => {
      const count = allTemplates?.filter(t => t.school_id === schoolId).length || 0;
      console.log(`     • ${schoolId.substring(0, 8)}... (${count} templates)`);
    });

    // 6. Check for duplicate TIMETABLE_CLASSES
    console.log('\n6️⃣ DUPLICATE CHECK');
    console.log('─'.repeat(70));
    
    const ttCount = allTemplates?.filter(t => t.key === 'TIMETABLE_CLASSES').length || 0;
    console.log(`   TIMETABLE_CLASSES count: ${ttCount}`);
    
    if (ttCount > 1) {
      console.log(`   ⚠️  MULTIPLE TIMETABLE_CLASSES FOUND!`);
      allTemplates?.filter(t => t.key === 'TIMETABLE_CLASSES').forEach((t, idx) => {
        console.log(`      [${idx+1}] ID: ${t.id.substring(0, 8)}... School: ${t.school_id.substring(0, 8)}...`);
      });
    } else if (ttCount === 0) {
      console.log(`   ❌ NO TIMETABLE_CLASSES TEMPLATE FOUND!`);
    } else {
      console.log(`   ✅ Single TIMETABLE_CLASSES template found`);
    }

    console.log('\n' + '═'.repeat(70));
    console.log('\n📊 SUMMARY:');
    console.log(`   • Total templates: ${allTemplates?.length || 0}`);
    console.log(`   • TIMETABLE_CLASSES: ${ttCount}`);
    console.log(`   • Physical entries: ${physicalEntries?.length || 0}`);
    console.log(`   • Live entries: ${liveEntries?.length || 0}\n`);

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    if (err.details) console.error('Details:', err.details);
    process.exit(1);
  }
}

deepAudit();
