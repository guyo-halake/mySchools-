const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vomsaqkhtturzqfuwxsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcwMjE2OCwiZXhwIjoyMDkxMjc4MTY4fQ.dDCG60Khw2o3OwksT_rQZ4F9A3vnNpHSKuQWKXet1C4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function directBillAll() {
  const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
  console.log('--- EXECUTING DIRECT SCHOOL-WIDE BILLING ---');

  // 1. Get students
  const { data: students } = await supabase
    .from('students')
    .select('id')
    .eq('school_id', schoolId);

  if (!students || students.length === 0) {
    console.error('No students found to bill.');
    return;
  }

  // 2. Get any term
  const { data: terms } = await supabase
    .from('terms')
    .select('id')
    .eq('school_id', schoolId)
    .limit(1);

  const termId = terms?.[0]?.id;
  if (!termId) {
     console.error('No term found to attach the bill.');
     return;
  }

  // 3. Create raw invoices directly in the 'fees' table
  const invoices = students.map(s => ({
    school_id: schoolId,
    student_id: s.id,
    term_id: termId,
    amount_due: 300,
    amount_paid: 0,
    status: 'UNPAID',
    type: 'School system fees'
  }));

  const { data, error } = await supabase
    .from('fees')
    .insert(invoices)
    .select();

  if (error) {
    console.error('BILLING ERROR:', error.message);
  } else {
    console.log(`SUCCESS: Billed ${students.length} students 300 KES each.`);
  }
}

directBillAll();
