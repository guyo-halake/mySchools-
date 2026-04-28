
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function auditRoles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .limit(100);
    
  if (error) {
    console.error('Audit Error:', error);
  } else {
    const roles = [...new Set(data.map(p => p.role))];
    console.log('UNFILTERED DATABASE ROLES:', roles);
  }
}

auditRoles();
