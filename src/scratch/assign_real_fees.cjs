const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vomsaqkhtturzqfuwxsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcwMjE2OCwiZXhwIjoyMDkxMjc4MTY4fQ.dDCG60Khw2o3OwksT_rQZ4F9A3vnNpHSKuQWKXet1C4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function assignSchoolSystemFees() {
  const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5'; // Using the known school ID
  const feeName = 'School system fees';
  const amount = 300;

  console.log('--- STARTING REAL FEE ASSIGNMENT ---');

  // 1. Get Active Term
  const { data: terms } = await supabase
    .from('academic_terms')
    .select('*')
    .eq('school_id', schoolId)
    .eq('is_current', true)
    .limit(1);

  let termId = terms?.[0]?.id;
  if (!termId) {
    const { data: lastTerm } = await supabase
      .from('academic_terms')
      .select('*')
      .eq('school_id', schoolId)
      .order('year', { ascending: false })
      .limit(1);
    termId = lastTerm?.[0]?.id;
  }

  if (!termId) {
    console.error('ERROR: No term found in database. Cannot assign fees.');
    return;
  }

  console.log('Using Term ID:', termId);

  // 2. Create Fee Structure
  const { data: struct, error: structError } = await supabase
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

  if (structError) {
    console.error('Error creating structure:', structError);
    return;
  }

  // 3. Add Fee Item
  await supabase.from('fee_items').insert([{
    structure_id: struct.id,
    name: feeName,
    amount: amount
  }]);

  // 4. Get All Students
  const { data: students } = await supabase
    .from('students')
    .select('id')
    .eq('school_id', schoolId);

  if (!students || students.length === 0) {
    console.error('No students found to bill.');
    return;
  }

  // 5. Generate Invoices in 'fees' table
  const feeRecords = students.map(s => ({
    student_id: s.id,
    structure_id: struct.id,
    amount_due: amount,
    amount_paid: 0,
    status: 'UNPAID',
    type: 'System Fee',
    school_id: schoolId
  }));

  const { error: invoiceError } = await supabase.from('fees').insert(feeRecords);

  if (invoiceError) {
    console.error('Error creating invoices:', invoiceError);
  } else {
    console.log(`SUCCESS: Assigned ${amount} KES for "${feeName}" to ${students.length} students.`);
  }
}

assignSchoolSystemFees();
