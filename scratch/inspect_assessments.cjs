const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function inspectAssessments() {
  try {
    await client.connect();
    
    // Inspect 5 records from cbc_student_assessments
    const res = await client.query(`
      SELECT * FROM cbc_student_assessments LIMIT 5
    `);
    console.log('Sample assessments:');
    console.log(res.rows);

    // Check if student_id exists in profiles or students
    if (res.rows.length > 0) {
      const sid = res.rows[0].student_id;
      const profRes = await client.query(`SELECT id, role, full_name FROM profiles WHERE id = $1`, [sid]);
      console.log('\nStudent profile search:', profRes.rows);

      const studRes = await client.query(`SELECT id, stream_id FROM students WHERE id = $1`, [sid]);
      console.log('Student table search:', studRes.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

inspectAssessments();
