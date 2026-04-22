const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function listAllResultsForRazanyoo() {
  try {
    await pgClient.connect();
    // Find all students named Razanyoo
    const studentsRes = await pgClient.query("SELECT students.id, students.adm_no, profiles.full_name FROM students JOIN profiles ON students.id = profiles.id WHERE profiles.full_name = 'Razanyoo'");
    if (studentsRes.rows.length === 0) {
      console.log('No students named Razanyoo found.');
      return;
    }
    for (const student of studentsRes.rows) {
      console.log('Student:', student);
      // List all exam_results for this student
      const resultsRes = await pgClient.query('SELECT * FROM exam_results WHERE student_id = $1', [student.id]);
      console.log('  Exam results count:', resultsRes.rows.length);
      for (const result of resultsRes.rows) {
        console.log('    ', result);
      }
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pgClient.end();
  }
}

listAllResultsForRazanyoo();
