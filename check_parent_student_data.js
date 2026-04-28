const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function checkParentStudentData() {
  try {
    await pgClient.connect();
    // 1. Find parent by email
    const parentEmail = 'guyohalakeofficial@gmail.com';
    const parentRes = await pgClient.query('SELECT id, full_name FROM profiles WHERE email = $1', [parentEmail]);
    if (parentRes.rows.length === 0) throw new Error('Parent not found');
    const parentId = parentRes.rows[0].id;
    console.log('Parent:', parentRes.rows[0]);

    // 2. Find all students linked to this parent
    const studentsRes = await pgClient.query('SELECT id, adm_no, full_name FROM students JOIN profiles ON students.id = profiles.id WHERE parent_id = $1', [parentId]);
    if (studentsRes.rows.length === 0) {
      console.log('No students linked to this parent.');
      return;
    }
    console.log('Students linked to parent:');
    for (const student of studentsRes.rows) {
      console.log(student);
      // 3. Check for exam results
      const resultsRes = await pgClient.query('SELECT * FROM exam_results WHERE student_id = $1', [student.id]);
      console.log('  Exam results:', resultsRes.rows.length);
      // 4. Check for fees
      const feesRes = await pgClient.query('SELECT * FROM fees WHERE student_id = $1', [student.id]);
      console.log('  Fees records:', feesRes.rows.length);
    }
  } catch (e) {
    console.error('Check error:', e);
  } finally {
    await pgClient.end();
  }
}

checkParentStudentData();
