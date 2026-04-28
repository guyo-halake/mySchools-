const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTemplateChanges() {
  try {
    console.log('🧪 TEMPLATE UPDATE TEST\n');
    console.log('─'.repeat(60));

    // 1. Get current template
    console.log('\n1️⃣ Fetching current TIMETABLE_CLASSES template...');
    const { data: templates, error: fetchErr } = await supabase
      .from('templates')
      .select('*')
      .eq('key', 'TIMETABLE_CLASSES')
      .eq('archived', false)
      .limit(1);

    if (fetchErr) throw fetchErr;
    if (!templates || templates.length === 0) {
      console.error('❌ No template found');
      process.exit(1);
    }

    const template = Array.isArray(templates) ? templates[0] : templates;
    const templateId = template.id;
    const currentConfig = template.config || {};

    console.log(`   ✓ Found template ID: ${templateId}`);
    console.log(`   Current times: ${currentConfig.schoolStartTime} → ${currentConfig.schoolEndTime}`);
    console.log(`   Current breaks: ${currentConfig.breaks?.length || 0}`);
    console.log(`   Current custom items: ${currentConfig.customEntries?.length || 0}`);

    // 2. Update with new values
    console.log('\n2️⃣ Updating template with test values...');
    const newConfig = {
      ...currentConfig,
      schoolStartTime: '07:00',
      classStartTime: '07:00',
      classEndTime: '14:00',
      schoolEndTime: '14:30',
      periodMinutes: 50,
      breaks: [
        { id: 'break-1', afterPeriods: 2, durationMinutes: 15, label: 'TEST Morning Break' },
        { id: 'break-2', afterPeriods: 4, durationMinutes: 30, label: 'TEST Lunch' },
        { id: 'break-3', afterPeriods: 5, durationMinutes: 10, label: 'TEST Afternoon Break' }
      ],
      customEntries: [
        { id: 'custom-1', name: 'TEST Assembly', type: 'ASSEMBLY', startTime: '07:00', endTime: '07:20' },
        { id: 'custom-2', name: 'TEST Sports Day', type: 'CUSTOM', startTime: '13:00', endTime: '14:00' },
        { id: 'custom-3', name: 'TEST Exam Session', type: 'EXAMS', startTime: '08:00', endTime: '10:00' }
      ],
      defaultClassLabel: 'TEST-Class',
      roomPrefix: 'TEST-Room',
      releaseState: 'PUBLISHED'
    };

    const { data: updateResult, error: updateErr } = await supabase
      .from('templates')
      .update({ config: newConfig })
      .eq('id', templateId)
      .select();

    if (updateErr) throw updateErr;
    console.log('   ✓ Template updated successfully');

    // 3. Wait a moment for DB sync
    console.log('\n3️⃣ Waiting for database to sync...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 4. Read back to verify
    console.log('\n4️⃣ Reading back updated template...');
    const { data: verifyTemplate, error: verifyErr } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .limit(1);

    if (verifyErr) throw verifyErr;
    const verified = Array.isArray(verifyTemplate) ? verifyTemplate[0] : verifyTemplate;
    if (!verified) {
      console.error('❌ Template not found on read-back');
      process.exit(1);
    }

    const verifiedConfig = verified.config || {};

    console.log('\n✅ VERIFICATION RESULTS:');
    console.log('─'.repeat(60));
    
    console.log('\n⏰ Times Changed:');
    console.log(`   School: ${verifiedConfig.schoolStartTime} → ${verifiedConfig.schoolEndTime} (was 08:00 → 15:30)`);
    console.log(`   Classes: ${verifiedConfig.classStartTime} → ${verifiedConfig.classEndTime} (was 08:00 → 15:30)`);
    console.log(`   Period: ${verifiedConfig.periodMinutes} minutes (was 45)`);

    console.log('\n🔔 Breaks (${verifiedConfig.breaks?.length || 0}):');
    if (Array.isArray(verifiedConfig.breaks)) {
      verifiedConfig.breaks.forEach((b, idx) => {
        console.log(`   ${idx + 1}. "${b.label}" - After period ${b.afterPeriods} for ${b.durationMinutes} min`);
      });
    }

    console.log('\n📝 Custom Events (${verifiedConfig.customEntries?.length || 0}):');
    if (Array.isArray(verifiedConfig.customEntries)) {
      verifiedConfig.customEntries.forEach((item, idx) => {
        console.log(`   ${idx + 1}. "${item.name}" [${item.type}] ${item.startTime}–${item.endTime}`);
      });
    }

    console.log('\n⚙️ Other Settings:');
    console.log(`   Default Label: ${verifiedConfig.defaultClassLabel}`);
    console.log(`   Room Prefix: ${verifiedConfig.roomPrefix}`);
    console.log(`   Status: ${verifiedConfig.releaseState}`);

    console.log('\n' + '─'.repeat(60));
    console.log('\n✨ TEST COMPLETE - All changes saved to database');
    console.log('\n📋 Next step: Open Timetable page and refresh (Ctrl+Shift+R)');
    console.log('   You should see:');
    console.log('   • Class times: 07:00-14:00');
    console.log('   • 50-minute periods');
    console.log('   • 3 TEST breaks');
    console.log('   • 3 TEST custom events');
    console.log('\n');

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    process.exit(1);
  }
}

testTemplateChanges();
