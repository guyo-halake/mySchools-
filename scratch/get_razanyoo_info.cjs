const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function getStudentDossier(name) {
  console.log(`Searching for student: ${name}...`);
  
  // 1. Get Profile & Student record
  const { data: profile, error: pError } = await supabase
    .from('profiles')
    .select('*, students!students_id_fkey(*, stream:streams(*, class:classes(*)))')
    .ilike('full_name', `%${name}%`)
    .single();

  if (pError || !profile) {
    console.log("Student not found.");
    return;
  }

  const studentId = profile.students[0].id;
  const schoolId = profile.school_id;

  // 2. Get Subjects
  const { data: subjects } = await supabase
    .from('student_subjects')
    .select('*, subject:subjects(name)')
    .eq('student_id', studentId);

  // 3. Get Results
  const { data: results } = await supabase
    .from('exam_results')
    .select('*, subject:subjects(name), exam:exams(term_id, type)')
    .eq('student_id', studentId);

  // 4. Get Disciplinary Records
  const { data: discipline } = await supabase
    .from('disciplinary_records')
    .select('*')
    .eq('student_id', studentId);

  // 5. Get Fee Balance (simplified)
  const { data: fees } = await supabase
    .from('fees')
    .select('*')
    .eq('student_id', studentId);

  console.log("\n--- STUDENT DOSSIER: " + profile.full_name + " ---");
  console.log("ADM NO: " + profile.students[0].adm_no);
  console.log("CLASS: Form " + profile.students[0].stream.class.name.slice(-1) + " " + profile.students[0].stream.name);
  console.log("STATUS: Active");
  
  console.log("\n[SUBJECT ENROLLMENT]");
  if (subjects && subjects.length > 0) {
    subjects.forEach(s => console.log("- " + s.subject.name));
  } else {
    console.log("No specific subjects linked yet.");
  }

  console.log("\n[ACADEMIC PERFORMANCE]");
  if (results && results.length > 0) {
    results.forEach(r => console.log(`${r.exam.term_id} ${r.exam.type}: ${r.subject.name} -> ${r.marks} (${r.grade})`));
  } else {
    console.log("No exam results recorded.");
  }

  console.log("\n[DISCIPLINARY HISTORY]");
  if (discipline && discipline.length > 0) {
    discipline.forEach(d => console.log(`[${d.incident_date}] ${d.incident_title}: ${d.action_taken}`));
  } else {
    console.log("Clean Record. No disciplinary incidents found.");
  }

  console.log("\n[FINANCIAL STANDING]");
  const totalOwed = fees?.reduce((sum, f) => sum + (f.amount || 0), 0) || 0;
  console.log(`Balance: Ksh ${totalOwed}.00`);
}

getStudentDossier('Razanyoo');
