import { supabase } from '../lib/supabase';

async function debugFees() {
  const { data: fees, error: fErr } = await supabase.from('fees').select('*, student:students(full_name)');
  console.log('ALL FEES IN DB:', fees);
  
  const { data: schools } = await supabase.from('schools').select('*');
  console.log('ALL SCHOOLS IN DB:', schools);
  
  const { data: students } = await supabase.from('students').select('count');
  console.log('STUDENT COUNT:', students);
}

debugFees();
