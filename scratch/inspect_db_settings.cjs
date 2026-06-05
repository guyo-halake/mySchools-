const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspect() {
  const { data: schoolsInfo, error: err1 } = await supabase.from('schools').select('*').limit(1);
  console.log('Schools schema:', Object.keys(schoolsInfo?.[0] || {}));

  const { data: termsInfo, error: err2 } = await supabase.from('terms').select('*').limit(1);
  console.log('Terms schema:', Object.keys(termsInfo?.[0] || {}));
}
inspect();
