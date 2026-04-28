const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
  const { data: acad, error } = await supabase
    .from('templates')
    .select('*')
    .eq('school_id', schoolId)
    .like('key', '%CALENDAR%');

  if (error) {
    console.error(error);
    return;
  }

  if (acad && acad.length > 0) {
    const template = acad[0];
    console.log('=== ACADEMIC CALENDAR TEMPLATE ===\n');
    console.log('Name:', template.name);
    console.log('Key:', template.key);
    console.log('Created:', template.created_at);
    console.log('Updated:', template.updated_at);
    console.log('Updated by:', template.updated_by);
    console.log('Config terms count:', template.config?.terms?.length || 0);

    if (template.config?.terms) {
      console.log('\nTerms in template config:');
      template.config.terms.forEach((t, i) => {
        console.log(`  ${i + 1}. ${t.name}`);
        console.log(`     Start: ${t.startDate}`);
        console.log(`     End: ${t.endDate}`);
      });
    }
  } else {
    console.log('No academic calendar template found');
    const { data: all } = await supabase
      .from('templates')
      .select('key, name')
      .eq('school_id', schoolId);
    console.log('\nAvailable templates:');
    all.forEach((t) => console.log(`  - ${t.key}: ${t.name}`));
  }
})();
