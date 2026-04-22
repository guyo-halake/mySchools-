const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function getRazanyooDetails() {
  try {
    await pgClient.connect();
    // 1. Find student by name
    const studentRes = await pgClient.query(`
      SELECT s.id, s.adm_no, p.full_name, p.email, s.parent_id
      FROM students s
      JOIN profiles p ON s.id = p.id
      WHERE LOWER(p.full_name) LIKE '%razanyoo%'
      LIMIT 1
    `);
    if (studentRes.rows.length === 0) {
      console.log('No student named "razanyoo" found.');
      return;
    }
    const student = studentRes.rows[0];
    console.log('Student Info:', student);

    // 2. Get parent info
    let parent = null;
    if (student.parent_id) {
      const parentRes = await pgClient.query(
        'SELECT id, full_name, email FROM profiles WHERE id = $1',
        [student.parent_id]
      );
      if (parentRes.rows.length > 0) {
        parent = parentRes.rows[0];
        console.log('Parent Info:', parent);
      }
    }

    // 3. Get all exam results
    const resultsRes = await pgClient.query(
      'SELECT * FROM exam_results WHERE student_id = $1',
      [student.id]
    );
    console.log('Exam Results:', resultsRes.rows);

    // 4. Get all exams (distinct subjects)
    const examsRes = await pgClient.query(
      'SELECT DISTINCT subject_id FROM exam_results WHERE student_id = $1',
      [student.id]
    );
    console.log('Subjects/Exams Done:', examsRes.rows);

    // 5. Get fees balance
    const feesRes = await pgClient.query(
      'SELECT * FROM fees WHERE student_id = $1',
      [student.id]
    );
    console.log('Fees Records:', feesRes.rows);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pgClient.end();
  }
}

getRazanyooDetails();
