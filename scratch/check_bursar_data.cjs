const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: fees } = await supabase.from('fees').select('*').gt('amount_paid', 0);
  console.log('Fees with amount_paid > 0:', fees?.length);
  
  const { data: payments } = await supabase.from('fee_payments').select('*');
  console.log('Fee payments table count:', payments?.length);
}
check();
