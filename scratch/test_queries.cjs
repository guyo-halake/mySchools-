const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const schoolId = '4eb8b0f6-90be-44d5-b220-a7995cc3c87b';
  
  console.log('Testing getUnifiedFeed...');
  const { data: p1, error: e1 } = await supabase.from('fee_payments').select('*, fee:fees(type, student:students(profile:profiles!students_id_fkey(full_name)))').eq('school_id', schoolId).order('created_at', { ascending: false }).limit(10);
  if (e1) console.error('getUnifiedFeed (payments) error:', e1);
  else console.log('p1:', p1?.length);

  const { data: t1, error: e2 } = await supabase.from('transactions').select('*, account:accounts(name), vote_head:vote_heads(name)').eq('school_id', schoolId).order('created_at', { ascending: false }).limit(10);
  if (e2) console.error('getUnifiedFeed (trans) error:', e2);
  else console.log('t1:', t1?.length);

  console.log('Testing getVoteHeads...');
  const { data: v, error: e3 } = await supabase.from('vote_heads').select('*').eq('school_id', schoolId);
  if (e3) console.error('getVoteHeads error:', e3);
  else console.log('v:', v?.length);
  
  console.log('Done.');
}
test();
