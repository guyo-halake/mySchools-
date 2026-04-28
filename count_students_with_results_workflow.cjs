const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function countStudentsWithResultsWorkflow() {
  try {
    await pgClient.connect();
    // Count unique students with at least one result in results_workflow
    const res = await pgClient.query('SELECT COUNT(DISTINCT student_id) AS student_count FROM results_workflow');
    console.log('Number of students with results in results_workflow:', res.rows[0].student_count);
    // List those student IDs
    const listRes = await pgClient.query('SELECT DISTINCT student_id FROM results_workflow');
    console.log('Student IDs with results:', listRes.rows.map(r => r.student_id));
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pgClient.end();
  }
}

countStudentsWithResultsWorkflow();
