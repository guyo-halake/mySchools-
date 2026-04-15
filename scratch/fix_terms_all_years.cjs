const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixTerms() {
  try {
    const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
    const currentYear = new Date().getFullYear();

    console.log('\n=== FIXING TERMS (Remove Duplicates & Insert All Years) ===\n');

    // Get template config
    const { data: template } = await supabase
      .from('templates')
      .select('config')
      .eq('school_id', schoolId)
      .eq('key', 'ACADEMIC_CALENDAR_SETUP')
      .single();

    const config = template?.config || {};
    const terms = config.terms || [];

    // Delete ALL terms for this school
    console.log('🗑️  Deleting old terms...');
    await supabase.from('terms').delete().eq('school_id', schoolId);

    // Generate and insert terms for current year + 5 future years
    const newTerms = [];
    
    for (let year = currentYear - 1; year <= currentYear + 5; year++) {
      for (const term of terms) {
        const startDate = new Date(term.startDate);
        const endDate = new Date(term.endDate);

        // Keep same month/day, change year
        const newStart = new Date(year, startDate.getMonth(), startDate.getDate())
          .toISOString()
          .split('T')[0];
        const newEnd = new Date(year, endDate.getMonth(), endDate.getDate())
          .toISOString()
          .split('T')[0];

        newTerms.push({
          school_id: schoolId,
          name: `Term ${term.termNumber} ${year}`,
          year,
          start_date: newStart,
          end_date: newEnd
        });
      }
    }

    console.log(`✅ Deleted old terms\n`);
    console.log(`📤 Inserting ${newTerms.length} new terms for ${currentYear - 1} - ${currentYear + 5}...\n`);

    const { error } = await supabase.from('terms').insert(newTerms);

    if (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }

    console.log(`✅ Successfully inserted:\n`);
    newTerms.forEach((t) => {
      console.log(`   ${t.name}: ${t.start_date} → ${t.end_date}`);
    });

    console.log(`\n✨ Done! Terms generated for ${currentYear - 1} through ${currentYear + 5}\n`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

fixTerms();
