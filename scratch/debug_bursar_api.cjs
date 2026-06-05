const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const schoolId = 'b292e105-021d-40d6-be4b-01c5187af542'; // Assuming there's a school ID, let's just get the first one
  const { data: school } = await supabase.from('schools').select('id').limit(1).single();
  const sid = school?.id;
  
  console.log('Testing unified feed query for school:', sid);
  
  const { data: p, error: pe } = await supabase
      .from('fee_payments')
      .select('*, fee:fees(type, student:students(profile:profiles!students_id_fkey(full_name)))')
      .limit(5);
      
  if (pe) console.error('Fee Payments Error:', pe);
  else console.log('Payments:', p?.length);

  const { data: t, error: te } = await supabase
      .from('transactions')
      .select('*, account:accounts(name), vote_head:vote_heads(name)')
      .limit(5);
      
  if (te) console.error('Transactions Error:', te);
  else console.log('Transactions:', t?.length);
}
check();
