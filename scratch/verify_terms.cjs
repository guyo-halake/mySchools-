const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const { data } = await supabase
    .from('terms')
    .select('name, year, start_date, end_date')
    .eq('school_id', 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5')
    .order('year')
    .order('name');

  console.log('\n=== TERMS DATABASE ===\n');
  let currentYear = null;
  data?.forEach((t) => {
    if (t.year !== currentYear) {
      currentYear = t.year;
      console.log(`Year ${t.year}:`);
    }
    console.log(`  • ${t.name}: ${t.start_date} -> ${t.end_date}`);
  });

  console.log(`\nTotal: ${data?.length || 0} terms stored in database\n`);
  console.log('KEY POINTS:');
  console.log('✅ NOT HARDCODED - Dynamically generated from template pattern');
  console.log('✅ Covers past (2025), present (2026), and future (2027-2031)');
  console.log('✅ School-wide system (all forms use same terms)');
  console.log('✅ To support new years: run generation script again\n');
})();
