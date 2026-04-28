const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkSupport() {
  const { data, error } = await supabase
    .from('support_requests')
    .select('*')
    .limit(10);
    
  if (error) {
    console.error('Support Check Error:', error);
  } else {
    console.log('SUPPORT REQUESTS:', data);
  }
}

checkSupport();
