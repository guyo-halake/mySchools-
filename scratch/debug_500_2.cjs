const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const sid = '4eb8b0f6-90be-44d5-b220-a7995cc3c87b'; // Giakanja test school
  
  const { error: e1 } = await supabase.from('vote_heads').select('*').eq('school_id', sid);
  if (e1) console.error('vote_heads error:', e1);
  else console.log('vote_heads ok');

  const { error: e2 } = await supabase.from('accounts').select('*').eq('school_id', sid);
  if (e2) console.error('accounts error:', e2);
  else console.log('accounts ok');
}
check();
