const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://vomsaqkhtturzqfuwxsn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcwMjE2OCwiZXhwIjoyMDkxMjc4MTY4fQ.dDCG60Khw2o3OwksT_rQZ4F9A3vnNpHSKuQWKXet1C4');

async function fixSecurity() {
  console.log('🔓 Starting Security Reset for results_workflow...');
  
  // Use a direct SQL execution if possible, but since we are using JS client,
  // we will rely on the fact that SERVICE_ROLE_KEY bypasses RLS.
  // However, we want to ENSURE the frontend (ANON key) can work.
  // We will run some raw SQL to grant permissions.
  
  const { error } = await supabase.rpc('execute_sql', {
    sql: `
      -- Enable RLS and add permissive policies
      ALTER TABLE results_workflow ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Allow all for authenticated" ON results_workflow;
      CREATE POLICY "Allow all for authenticated" 
      ON results_workflow FOR ALL 
      TO authenticated 
      USING (true) 
      WITH CHECK (true);
      
      -- Do the same for subjects and students just in case
      ALTER TABLE students ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Allow read for authenticated" ON students;
      CREATE POLICY "Allow read for authenticated" ON students FOR SELECT TO authenticated USING (true);
    `
  });

  if (error) {
    if (error.message.includes('execute_sql')) {
      console.log('⚠️ execute_sql RPC not found. Trying another way...');
      // Fallback: If we can't run SQL, we might need the user to run it in Supabase Studio.
    } else {
      console.error('❌ Error fixing security:', error);
    }
  } else {
    console.log('✅ Security Policies reset successfully!');
  }
}

fixSecurity();
