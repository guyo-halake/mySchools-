const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Replicate the Timetable.tsx logic
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function toClock(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function buildSlotsFromTemplate(config) {
  const breakMap = new Map();
  config.breaks.forEach((b) => breakMap.set(b.afterPeriods, b));

  const slots = [];
  let current = toMinutes(config.classStartTime || config.schoolStartTime);
  const end = toMinutes(config.classEndTime || config.schoolEndTime);
  let periods = 0;

  while (current < end) {
    const classEnd = current + config.periodMinutes;
    if (classEnd > end) break;

    slots.push({
      start: toClock(current),
      end: toClock(classEnd),
      isBreak: false
    });

    current = classEnd;
    periods += 1;

    const breakAfter = breakMap.get(periods);
    if (breakAfter) {
      const breakEnd = current + breakAfter.durationMinutes;
      if (breakEnd <= end) {
        slots.push({
          start: toClock(current),
          end: toClock(breakEnd),
          isBreak: true,
          label: breakAfter.label || 'Break'
        });
        current = breakEnd;
      }
    }
  }

  return slots;
}

function getClassSignature(entries) {
  return entries
    .map((item) => `${item.day_of_week}|${item.start_time}|${item.end_time}`)
    .sort()
    .join('||');
}

async function auditSignatureMismatch() {
  try {
    console.log('\n🔍 SIGNATURE MISMATCH DETECTION AUDIT\n');
    console.log('═'.repeat(70));

    // Get template
    const { data: templates } = await supabase
      .from('templates')
      .select('*')
      .eq('key', 'TIMETABLE_CLASSES')
      .eq('archived', false)
      .limit(1);

    if (!templates || !templates[0]) {
      console.error('No template');
      process.exit(1);
    }

    const config = templates[0].config;
    console.log('\n📋 Current Template Config:');
    console.log(`  schoolStartTime: ${config.schoolStartTime}`);
    console.log(`  classStartTime: ${config.classStartTime}`);
    console.log(`  classEndTime: ${config.classEndTime}`);
    console.log(`  periodMinutes: ${config.periodMinutes}`);
    console.log(`  breaks: ${config.breaks.length}`);

    // Build EXPECTED slots from NEW template
    const newSlots = buildSlotsFromTemplate(config);
    const dayOrder = config.dayOrder || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const expectedEntries = dayOrder.length * newSlots.filter((s) => !s.isBreak).length;

    console.log('\n🆕 Expected from NEW config:');
    console.log(`  Slots per day: ${newSlots.filter((s) => !s.isBreak).length} (${newSlots.length} incl. breaks)`);
    console.log(`  Expected total entries: ${expectedEntries}`);
    console.log(`  Sample slot times: ${newSlots.slice(0, 3).map((s) => `${s.start}-${s.end}`).join(', ')}`);

    // Get ACTUAL physical entries
    const { data: physical } = await supabase
      .from('physical_timetable_entries')
      .select('*')
      .eq('school_id', templates[0].school_id)
      .limit(100);

    const actualEntries = physical || [];
    const actualSignature = getClassSignature(actualEntries);

    console.log('\n🔴 Actual from DB:');
    console.log(`  Actual count: ${actualEntries.length}`);
    console.log(`  Sample entry times: ${actualEntries.slice(0, 3).map((e) => `${e.day_of_week} ${e.start_time}-${e.end_time}`).join(', ')}`);

    // Build expected signature
    const expectedSignature = getClassSignature(
      dayOrder.flatMap((day) =>
        newSlots
          .filter((slot) => !slot.isBreak)
          .map((slot, idx) => ({
            id: `${day}-${slot.start}-${idx}`,
            day_of_week: day,
            start_time: slot.start,
            end_time: slot.end,
            subject_id: null,
            stream_id: null,
            class_label: '',
            room: null,
            note: null,
            is_mine: false
          }))
      )
    );

    console.log('\n🔍 Signature Comparison:');
    const lengthMatch = actualEntries.length === expectedEntries;
    const signatureMatch = actualSignature === expectedSignature;

    console.log(`  Count match (${actualEntries.length} vs ${expectedEntries}): ${lengthMatch ? '✓ YES' : '❌ NO'}`);
    console.log(`  Signature match: ${signatureMatch ? '✓ YES' : '❌ NO'}`);

    const mustResync = !lengthMatch || !signatureMatch;
    console.log(`\n  Must resync? ${mustResync ? '✓ YES → regenerate' : '❌ NO → use existing'}`);

    // Show first few entries from both
    if (!signatureMatch) {
      console.log('\n📊 Signature Mismatch Details:');
      
      const actualFirst5 = actualEntries.slice(0, 5).map((e) => `${e.day_of_week}|${e.start_time}|${e.end_time}`).join('\n       ');
      const expectedFirst5 = dayOrder.flatMap((day) =>
        newSlots.filter((slot) => !slot.isBreak).slice(0, 1)
          .map((slot) => `${day}|${slot.start}|${slot.end}`)
      ).slice(0, 5).join('\n       ');

      console.log(`\n  Actual first entries:\n       ${actualFirst5}`);
      console.log(`\n  Expected first entries:\n       ${expectedFirst5}`);
    }

    console.log('\n' + '═'.repeat(70) + '\n');

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

auditSignatureMismatch();
