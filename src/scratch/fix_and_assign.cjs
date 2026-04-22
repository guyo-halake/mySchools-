const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vomsaqkhtturzqfuwxsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcwMjE2OCwiZXhwIjoyMDkxMjc4MTY4fQ.dDCG60Khw2o3OwksT_rQZ4F9A3vnNpHSKuQWKXet1C4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAndAssign() {
  const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
  
  console.log('--- SETTING UP DEFAULT TERM & ASSIGNING FEES ---');

  // 1. Create Default Term
  const { data: newTerm, error: termError } = await supabase
    .from('academic_terms')
    .insert([{
      school_id: schoolId,
      name: 'Term 1',
      year: 2026,
      start_date: '2026-01-01',
      end_date: '2026-04-30',
      is_current: true
    }])
    .select()
    .single();

  if (termError) {
    console.error('Term exists or error:', termError.message);
  }

  const termId = newTerm?.id || (await supabase.from('academic_terms').select('id').eq('is_current', true).limit(1)).data?.[0]?.id;

  if (!termId) {
    console.error('Still no term ID.');
    return;
  }

  // 2. Assign Fees
  const feeName = 'School system fees';
  const amount = 300;

  const { data: struct } = await supabase
    .from('fee_structures')
    .insert([{
      school_id: schoolId,
      term_id: termId,
      name: feeName,
      target_type: 'ALL',
      total_amount: amount
    }])
    .select()
    .single();

  await supabase.from('fee_items').insert([{
    structure_id: struct.id,
    name: feeName,
    amount: amount
  }]);

  const { data: students } = await supabase.from('students').select('id').eq('school_id', schoolId);
  
  const feeRecords = students.map(s => ({
    student_id: s.id,
    structure_id: struct.id,
    amount_due: amount,
    status: 'UNPAID',
    type: 'System Fee',
    school_id: schoolId
  }));

  await supabase.from('fees').insert(feeRecords);
  console.log(`DONE: Assigned 300 KES to ${students.length} students.`);
}

fixAndAssign();
