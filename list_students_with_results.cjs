const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function listStudentsWithResults() {
  const fs = require('fs');
  try {
    await pgClient.connect();
    // Get 10 students with at least 1 result
    const studentsRes = await pgClient.query(`
      SELECT s.id, s.adm_no, p.full_name, COUNT(r.id) as results_count
      FROM students s
      JOIN profiles p ON s.id = p.id
      JOIN exam_results r ON s.id = r.student_id
      GROUP BY s.id, s.adm_no, p.full_name
      ORDER BY results_count DESC
      LIMIT 10
    `);
    let output = '10 students with results:\n';
    for (const student of studentsRes.rows) {
      output += JSON.stringify(student) + '\n';
    }
    // Specifically look for a student named razanyoo
    const razanyooRes = await pgClient.query(`
      SELECT s.id, s.adm_no, p.full_name, COUNT(r.id) as results_count
      FROM students s
      JOIN profiles p ON s.id = p.id
      JOIN exam_results r ON s.id = r.student_id
      WHERE LOWER(p.full_name) LIKE '%razanyoo%'
      GROUP BY s.id, s.adm_no, p.full_name
    `);
    if (razanyooRes.rows.length > 0) {
      output += '\nStudent(s) named "razanyoo" with results:\n';
      for (const student of razanyooRes.rows) {
        output += JSON.stringify(student) + '\n';
      }
    } else {
      output += '\nNo student named "razanyoo" found with results.\n';
    }
    fs.writeFileSync('students_with_results_output.txt', output);
    console.log(output);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pgClient.end();
  }
}

listStudentsWithResults();
