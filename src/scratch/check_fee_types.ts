import { supabase } from '../lib/supabase';

async function checkFeeTypes() {
  const { data, error } = await supabase.from('fee_types').select('*');
  if (error) {
    console.error('DATABASE ERROR:', error);
  } else {
    console.log('--- FEE TYPES AUDIT ---');
    console.log('COUNT:', data.length);
    console.log('RECORDS:', data);
  }
}

checkFeeTypes();
