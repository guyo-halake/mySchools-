// Script: list_all_results_workflow.cjs
// Description: List all students with their results, grades, and marks from results_workflow

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load credentials from environment or config
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('results_workflow')
    .select(`
      id,
      student_id,
      marks,
      grade,
      subject_id,
      exam_type,
      exam_name,
      status,
      updated_at,
      student:students!results_workflow_student_id_fkey(id, adm_no, profile:profiles!students_id_fkey(full_name)),
      subject:subjects!results_workflow_subject_id_fkey(id, name)
    `)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching results:', error);
    process.exit(1);
  }

  if (!data.length) {
    console.log('No results found in results_workflow.');
    return;
  }

  for (const row of data) {
    const name = row.student?.profile?.full_name || '-';
    const adm = row.student?.adm_no || '-';
    const subject = row.subject?.name || '-';
    const marks = row.marks;
    const grade = row.grade;
    const exam = row.exam_name || row.exam_type || '-';
    const status = row.status;
    console.log(`${name} | ADM: ${adm} | Subject: ${subject} | Marks: ${marks} | Grade: ${grade} | Exam: ${exam} | Status: ${status}`);
  }
}

main();
