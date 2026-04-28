const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function auditPDFDataDeep() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const studentId = '037c8a46-f82f-40df-99ba-5e41904612d2'; // Razanyoo
    
    // 1. Get results with FULL details
    const rRes = await client.query(`
      SELECT 
        r.marks, 
        r.grade, 
        sub.name as subject_name,
        e.name as exam_name,
        e.type as exam_type,
        t.name as term_name,
        t.year as term_year
      FROM exam_results r
      JOIN subjects sub ON r.subject_id = sub.id
      JOIN exams e ON r.exam_id = e.id
      JOIN terms t ON e.term_id = t.id
      WHERE r.student_id = $1
    `, [studentId]);
    
    console.log('RESULTS DATA DUMP (First 3):');
    rRes.rows.slice(0, 3).forEach(r => console.log(r));

    // 2. Get student subjects
    const sSubRes = await client.query(`
      SELECT sub.name
      FROM student_subjects ss
      JOIN subjects sub ON ss.subject_id = sub.id
      WHERE ss.student_id = $1
    `, [studentId]);
    
    const subjectNames = sSubRes.rows.map(s => s.name);
    console.log('STUDENT SUBJECTS:', subjectNames);

    // 3. Test the "find" logic used in pdf.ts
    const searchTerm = 'TERM 1';
    const row0_subject = subjectNames[0];
    const resultsForYear = rRes.rows.filter(r => r.term_year === 2025);
    
    const mid = resultsForYear.find(r => 
      r.subject_name === row0_subject && 
      r.term_name.toUpperCase().includes(searchTerm) && 
      (r.exam_type?.includes('MID') || r.exam_name.toUpperCase().includes('MID'))
    );

    console.log('SIMULATED FIND FOR', row0_subject, 'IN TERM 1 2025:');
    console.log('FOUND:', mid ? mid.marks : 'NOTHING');

  } finally {
    await client.end();
  }
}

auditPDFDataDeep();
