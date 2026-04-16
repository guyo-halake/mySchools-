const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  'https://vomsaqkhtturzqfuwxsn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcwMjE2OCwiZXhwIjoyMDkxMjc4MTY4fQ.dDCG60Khw2o3OwksT_rQZ4F9A3vnNpHSKuQWKXet1C4'
);

async function testRpc() {
  console.log('Testing apply_calendar_template RPC...');
  
  // 1. Get the template ID for Giakanja
  const { data: templates } = await supabase
    .from('templates')
    .select('id, key, config')
    .eq('school_id', '78901234-5678-9012-3456-789012345678')
    .eq('key', 'ACADEMIC_CALENDAR_SETUP')
    .single();

  if (!templates) {
    console.error('Template not found');
    return;
  }

  console.log('Found Template ID:', templates.id);

  // 2. Prepare a config change (Term 1: Jan 13 -> Jan 14)
  const nextConfig = {
    ...templates.config,
    year: 2026,
    terms: [
      { termNumber: 1, name: 'Term 1 Updated (v4)', startDate: '2026-01-14', endDate: '2026-04-10' }
    ]
  };

  // 3. Call RPC
  const { data, error } = await supabase.rpc('apply_calendar_template', {
    p_template_id: templates.id,
    p_school_id: '78901234-5678-9012-3456-789012345678',
    p_config: nextConfig
  });

  if (error) {
    console.error('RPC Error:', error);
  } else {
    console.log('RPC Success:', data);
    
    // 4. Verify the database actually updated
    const { data: terms } = await supabase
      .from('terms')
      .select('*')
      .eq('school_id', '78901234-5678-9012-3456-789012345678')
      .eq('year', 2026);
    
    console.log('Database Terms after RPC:', JSON.stringify(terms, null, 2));
  }
}

testRpc();
