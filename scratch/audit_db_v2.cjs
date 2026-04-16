const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://vomsaqkhtturzqfuwxsn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcwMjE2OCwiZXhwIjoyMDkxMjc4MTY4fQ.dDCG60Khw2o3OwksT_rQZ4F9A3vnNpHSKuQWKXet1C4'
);

async function checkTemplates() {
  const { data: schools } = await supabase.from('schools').select('*');
  console.log('Schools:', JSON.stringify(schools, null, 2));

  const { data: templates } = await supabase.from('templates').select('*');
  console.log('Templates:', JSON.stringify(templates, null, 2));
}

checkTemplates();
