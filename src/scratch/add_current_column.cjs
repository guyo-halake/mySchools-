const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vomsaqkhtturzqfuwxsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcwMjE2OCwiZXhwIjoyMDkxMjc4MTY4fQ.dDCG60Khw2o3OwksT_rQZ4F9A3vnNpHSKuQWKXet1C4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function addCurrentColumn() {
  console.log('--- ADDING IS_CURRENT COLUMN TO TERMS ---');
  
  // We can't run ALTER TABLE directly via REST easily unless we have an RPC or use a trick.
  // But wait! I can try to run a query to check if it's already there (maybe the schema cache just didn't show it).
  // Actually, I'll advise the user to run it in SQL editor since I don't have a DDL RPC.
  
  console.log('Please run this in your Supabase SQL Editor:');
  console.log('ALTER TABLE terms ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT false;');
}

addCurrentColumn();
