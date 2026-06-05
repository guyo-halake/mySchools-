const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://vomsaqkhtturzqfuwxsn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDIxNjgsImV4cCI6MjA5MTI3ODE2OH0.3M2p0SWKO51yjkGtLnCyJOFsKiAwC__BnWoe_jZlPI8'
);

async function auditDB() {
  console.log('\n========== 1. CURRENT TERM ==========');
  const { data: terms } = await supabase.from('terms').select('*').order('start_date', { ascending: false });
  const currentTerm = terms?.find(t => t.is_current) || terms?.[0];
  console.log('All terms:', terms?.map(t => `${t.name} ${t.year} [current=${t.is_current}]`));
  console.log('Active term:', currentTerm ? `${currentTerm.name} ${currentTerm.year} (id: ${currentTerm.id})` : 'NONE');

  console.log('\n========== 2. FEES TABLE COLUMNS & SAMPLE ==========');
  const { data: feeSample } = await supabase.from('fees').select('*').limit(3);
  if (feeSample && feeSample.length > 0) {
    console.log('Columns:', Object.keys(feeSample[0]));
    console.log('Sample rows:');
    feeSample.forEach((f, i) => console.log(`  Row ${i+1}:`, JSON.stringify(f)));
  } else {
    console.log('No fee records found.');
  }

  console.log('\n========== 3. FEE PAYMENT COUNTS ==========');
  const { data: allFees, count: feeCount } = await supabase.from('fees').select('*', { count: 'exact' });
  console.log('Total fee records:', feeCount);
  const paidFees = allFees?.filter(f => Number(f.amount_paid) > 0) || [];
  const totalCollected = paidFees.reduce((acc, f) => acc + Number(f.amount_paid), 0);
  const totalDue = allFees?.reduce((acc, f) => acc + Number(f.amount_due), 0) || 0;
  const totalArrears = totalDue - totalCollected;
  console.log('Records with payment > 0:', paidFees.length);
  console.log('Total Due (all time):', totalDue.toLocaleString(), 'KES');
  console.log('Total Collected:', totalCollected.toLocaleString(), 'KES');
  console.log('Total Arrears:', totalArrears.toLocaleString(), 'KES');

  if (currentTerm) {
    const termFees = allFees?.filter(f => f.term_id === currentTerm.id) || [];
    const termPaid = termFees.reduce((acc, f) => acc + Number(f.amount_paid), 0);
    const termDue = termFees.reduce((acc, f) => acc + Number(f.amount_due), 0);
    console.log(`\nCurrent term (${currentTerm.name} ${currentTerm.year}):`);
    console.log('  Fee records:', termFees.length);
    console.log('  Term Due:', termDue.toLocaleString(), 'KES');
    console.log('  Term Collected:', termPaid.toLocaleString(), 'KES');
    console.log('  Term Arrears:', (termDue - termPaid).toLocaleString(), 'KES');
    
    // Check payment_date field
    const withPaymentDate = termFees.filter(f => f.payment_date);
    console.log('  Records with payment_date set:', withPaymentDate.length);
    if (withPaymentDate.length > 0) {
      const dates = [...new Set(withPaymentDate.map(f => f.payment_date))].sort().slice(-5);
      console.log('  Most recent payment dates:', dates);
    }
  }

  console.log('\n========== 4. RESULTS TABLE ==========');
  const { data: results, count: resultsCount } = await supabase.from('results').select('*', { count: 'exact' }).limit(3);
  console.log('Total results records:', resultsCount);
  if (results && results.length > 0) {
    console.log('Columns:', Object.keys(results[0]));
    console.log('Sample:', results.slice(0,2).map(r => `grade=${r.grade}, marks=${r.marks}, student_id=${r.student_id}`));
  } else {
    console.log('No results found.');
  }

  console.log('\n========== 5. STUDENTS & CBC ASSESSMENTS ==========');
  const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
  const { count: cbcCount } = await supabase.from('cbc_assessments').select('*', { count: 'exact', head: true });
  console.log('Total students:', studentCount);
  console.log('Total CBC assessments:', cbcCount);

  console.log('\n========== DONE ==========\n');
}

auditDB().catch(console.error);
