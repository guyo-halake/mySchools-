const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function audit() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const sid = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
    
    // 1. Get a sample student
    const r1 = await client.query("SELECT id, adm_no FROM students WHERE school_id = $1 LIMIT 1", [sid]);
    if (r1.rows.length === 0) return console.log('No students found');
    const studentId = r1.rows[0].id;
    console.log('AUDITING STUDENT:', studentId, 'ADM:', r1.rows[0].adm_no);

    // 2. Get results for this student
    const r2 = await client.query(`
      SELECT r.marks, r.grade, e.name as exam_name, t.name as term_name, t.year
      FROM exam_results r
      JOIN exams e ON r.exam_id = e.id
      JOIN terms t ON e.term_id = t.id
      WHERE r.student_id = $1
      ORDER BY t.year DESC, t.name DESC, e.date DESC
    `, [studentId]);
    
    console.log('--- EXAM RESULTS FOUND IN DB ---');
    console.table(r2.rows);

  } finally {
    await client.end();
  }
}

audit();
