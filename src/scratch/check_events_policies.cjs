
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPolicies() {
  const { data, error } = await supabase.rpc('get_policies', { table_name: 'events' });
  
  // Since RPC get_policies might not exist, we use the catalog table
  const { data: policies, error: polError } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'events');

  if (polError) {
    // Attempt raw select if pg_policies is visible
    console.error('Policy Check Error (Check if RPC/Views are restricted):', polError);
  } else {
    console.log('ACTIVE POLICIES FOR EVENTS:', policies);
  }
}

checkPolicies();
