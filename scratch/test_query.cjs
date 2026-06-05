const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: p, error: pe } = await supabase
      .from('fee_payments')
      .select('*, fee:fees(type, student:students(profile:profiles(full_name)))')
      .limit(1);
      
  console.log('Result:', pe || p);
}
check();
