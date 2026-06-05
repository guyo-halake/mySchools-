const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: p, error: pe } = await supabase
      .from('fee_payments')
      .select('*, fee:fees(type, student:students(profile:profiles!students_id_fkey(full_name)))')
      .limit(1);
      
  if (pe) console.error('Error 1:', pe);
  else console.log('Query 1 OK');

  const { data: t, error: te } = await supabase
      .from('transactions')
      .select('*, account:accounts(name), vote_head:vote_heads(name)')
      .limit(1);
      
  if (te) console.error('Error 2:', te);
  else console.log('Query 2 OK');
}
check();
