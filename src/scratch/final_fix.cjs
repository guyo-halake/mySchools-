const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vomsaqkhtturzqfuwxsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcwMjE2OCwiZXhwIjoyMDkxMjc4MTY4fQ.dDCG60Khw2o3OwksT_rQZ4F9A3vnNpHSKuQWKXet1C4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function finalFix() {
  const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
  console.log('--- EXECUTING FINAL FEE ASSIGNMENT ---');

  // 1. Get or Create Term
  let termId;
  const { data: existingTerms } = await supabase
    .from('terms')
    .select('id')
    .eq('school_id', schoolId)
    .order('year', { ascending: false })
    .limit(1);

  if (existingTerms && existingTerms.length > 0) {
    termId = existingTerms[0].id;
    console.log('Found existing term:', termId);
  } else {
    const { data: newTerm } = await supabase
      .from('terms')
      .insert([{
        school_id: schoolId,
        name: 'Term 1',
        year: 2026,
        start_date: '2026-01-01',
        end_date: '2026-04-30'
      }])
      .select()
      .single();
    termId = newTerm?.id;
    console.log('Created new term:', termId);
  }

  if (!termId) {
    console.error('ERROR: Could not get Term ID.');
    return;
  }

  // 2. Assign Fees
  const feeName = 'School system fees';
  const amount = 300;

  const { data: struct, error: se } = await supabase
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

  if (se) { console.error('Struct Error:', se.message); return; }

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
    type: feeName,
    school_id: schoolId
  }));

  const { error: fe } = await supabase.from('fees').insert(feeRecords);
  if (fe) console.error('Insert Error:', fe.message);
  
  console.log(`SUCCESS: Assigned 300 KES to ${students.length} students.`);
}

finalFix();
