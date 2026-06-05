const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://vomsaqkhtturzqfuwxsn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDIxNjgsImV4cCI6MjA5MTI3ODE2OH0.3M2p0SWKO51yjkGtLnCyJOFsKiAwC__BnWoe_jZlPI8'
);

const ALL_TABLES = [
  'activities','announcements','appointments','attendance','budgets',
  'cbc_projects','cbc_project_submissions','cbc_strands','cbc_student_assessments',
  'cbc_sub_strands','classes','classroom_assignments','classroom_sessions',
  'disciplinary_records','events','exam_results','exams','expenses',
  'fee_payment_requests','fees','fee_structure_items','fee_structures','fee_types',
  'grading_systems','in_app_notifications','learning_areas','profiles',
  'results_workflow','schools','streams','student_activities','student_health',
  'students','student_subjects','student_subject_term_averages',
  'student_term_averages','subjects','terms'
];

async function run() {
  console.log('\n===== ALL TABLES ROW COUNTS =====');
  const found = [];
  for (const t of ALL_TABLES) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    found.push({ table: t, count: error ? `ERR: ${error.message}` : count });
  }
  found.sort((a,b) => (Number(b.count)||0) - (Number(a.count)||0));
  found.forEach(r => console.log(`  ${r.table.padEnd(38)} ${r.count}`));

  // Deep check key tables
  const keyTables = ['cbc_student_assessments','exam_results','exams','results_workflow','student_term_averages','student_subject_term_averages'];
  console.log('\n===== KEY ACADEMIC TABLES - DEEP DIVE =====');
  for (const t of keyTables) {
    const { data, error } = await supabase.from(t).select('*').limit(2);
    if (error) { console.log(`[${t}] ERROR: ${error.message}`); continue; }
    if (!data || data.length === 0) { console.log(`[${t}] EMPTY`); continue; }
    console.log(`\n[${t}] columns: ${Object.keys(data[0]).join(', ')}`);
    data.forEach((row, i) => {
      const preview = Object.entries(row).slice(0,10).map(([k,v]) => `${k}=${JSON.stringify(v)}`).join(' | ');
      console.log(`  row${i+1}: ${preview}`);
    });
  }

  // All terms
  console.log('\n===== TERMS =====');
  const { data: terms } = await supabase.from('terms').select('*').order('created_at', { ascending: false });
  terms?.forEach(t => console.log(`  ${t.name} ${t.year||''} id=${t.id} is_current=${t.is_current}`));

  // Fees summary per term
  console.log('\n===== FEES PER TERM =====');
  const { data: fees } = await supabase.from('fees').select('term_id, amount_due, amount_paid, status');
  const byTerm = {};
  fees?.forEach(f => {
    if (!byTerm[f.term_id]) byTerm[f.term_id] = { count:0, due:0, paid:0 };
    byTerm[f.term_id].count++;
    byTerm[f.term_id].due += Number(f.amount_due)||0;
    byTerm[f.term_id].paid += Number(f.amount_paid)||0;
  });
  terms?.forEach(t => {
    const d = byTerm[t.id];
    if (d) console.log(`  ${t.name} ${t.year||''}: ${d.count} records | Due=${d.due.toLocaleString()} | Paid=${d.paid.toLocaleString()} | Arrears=${(d.due-d.paid).toLocaleString()}`);
  });
}

run().catch(console.error);
