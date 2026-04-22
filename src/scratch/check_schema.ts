import { supabase } from '../lib/supabase';

async function checkFeesSchema() {
  const { data, error } = await supabase.from('fees').select('*').limit(1);
  if (data && data[0]) {
    console.log('FEES COLUMNS:', Object.keys(data[0]));
  } else {
    console.log('No data to check columns, or error:', error);
  }
}

checkFeesSchema();
