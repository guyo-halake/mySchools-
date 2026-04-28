// Check which school is being used and see templates with calendar config
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  try {
    // Get the school (just the one we have)
    const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';

    // Get templates for this school
    const { data: templates, error } = await supabase
      .from('templates')
      .select('id, name, type, created_at, updated_at, created_by')
      .eq('school_id', schoolId);

    if (error) throw error;

    console.log('=== TEMPLATES FOR THIS SCHOOL ===\n');
    templates.forEach(t => {
      console.log(`Template: ${t.name} (${t.type})`);
      console.log(`  ID: ${t.id}`);
      console.log(`  Created: ${t.created_at || 'N/A'}`);
      console.log(`  Updated: ${t.updated_at || 'N/A'}`);
      console.log(`  Created By: ${t.created_by || 'N/A'}`);
      console.log();
    });

    // Also check the raw profile/users to understand who might have admin access
    console.log('\n=== SCHOOL INFO ===\n');
    const { data: schools, error: schulError } = await supabase
      .from('schools')
      .select('*')
      .eq('id', schoolId);

    if (!schulError && schools && schools.length > 0) {
      const school = schools[0];
      console.log(JSON.stringify(school, null, 2));
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
})();
