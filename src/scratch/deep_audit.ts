import { supabase } from '../lib/supabase';

async function auditDatabase() {
  console.log('--- STARTING DEEP DATABASE AUDIT ---');
  
  // 1. Check current school classes
  const { data: schoolData } = await supabase.from('profiles').select('school_id').limit(1).single();
  const schoolId = schoolData?.school_id;
  
  if (!schoolId) {
    console.log('Error: Could not determine school_id');
    return;
  }
  
  console.log('School ID:', schoolId);

  // 2. Classes Audit
  const { data: classes } = await supabase.from('classes').select('*').eq('school_id', schoolId);
  console.log('CLASSES COUNT:', classes?.length);
  console.log('CLASSES PREVIEW:', classes?.map(c => ({ id: c.id, name: c.name })));

  // 3. Streams Audit
  const { data: streams } = await supabase.from('streams').select('*, class:classes(name)').eq('school_id', schoolId);
  console.log('STREAMS COUNT:', streams?.length);
  console.log('STREAMS PREVIEW:', streams?.map(s => ({ id: s.id, fullName: `${s.class?.name} ${s.name}` })));

  // 4. Fee Types Audit
  const { data: feeTypes } = await supabase.from('fee_types').select('*').eq('school_id', schoolId);
  console.log('FEE TYPES COUNT:', feeTypes?.length);
  console.log('FEE TYPES PREVIEW:', feeTypes);
  
  const { data: allFeeTypes } = await supabase.from('fee_types').select('*').limit(5);
  console.log('ALL FEE TYPES (GLOBAL):', allFeeTypes);
}

auditDatabase();
