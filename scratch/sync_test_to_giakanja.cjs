const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function copyTestTemplateToGiakanja() {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('║  🚀 Syncing TEST Template from Alliance → Giakanja                   ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

    const ALLIANCE_ID = '4eb8b0f6-90be-44d5-b220-a7995cc3c87b';
    const GIAKANJA_ID = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';

    // Get the TEST template from Alliance
    const { data: allianceTemplate } = await supabase
      .from('templates')
      .select('*')
      .eq('school_id', ALLIANCE_ID)
      .eq('key', 'TIMETABLE_CLASSES')
      .single();

    if (!allianceTemplate) {
      console.error('❌ Alliance template not found');
      return;
    }

    console.log('📥 Alliance Template (TEST DATA):');
    console.log(`   Times: ${allianceTemplate.config.schoolStartTime} → ${allianceTemplate.config.schoolEndTime}`);
    console.log(`   Period: ${allianceTemplate.config.periodMinutes} min`);
    console.log(`   Breaks: ${allianceTemplate.config.breaks.length}`);
    console.log(`   Custom: ${allianceTemplate.config.customEntries.length}\n`);

    // Get Giakanja template
    const { data: giakanja } = await supabase
      .from('templates')
      .select('*')
      .eq('school_id', GIAKANJA_ID)
      .eq('key', 'TIMETABLE_CLASSES')
      .single();

    if (!giakanja) {
      console.error('❌ Giakanja template not found');
      return;
    }

    // Update Giakanja template with Alliance's config
    const { error: updateError } = await supabase
      .from('templates')
      .update({
        config: allianceTemplate.config,
        active: true,
        archived: false
      })
      .eq('id', giakanja.id);

    if (updateError) {
      console.error('❌ Update failed:', updateError.message);
      return;
    }

    console.log('✅ Giakanja Template UPDATED with TEST DATA:');
    console.log(`   Times: ${allianceTemplate.config.schoolStartTime} → ${allianceTemplate.config.schoolEndTime}`);
    console.log(`   Period: ${allianceTemplate.config.periodMinutes} min`);
    console.log(`   Breaks: ${allianceTemplate.config.breaks.length}`);
    console.log(`   Custom: ${allianceTemplate.config.customEntries.length}\n`);

    console.log('✅ Physical timetable entries will regenerate on next Timetable load\n');

  } catch (err) {
    console.error('Error:', err.message);
  }
}

copyTestTemplateToGiakanja();
