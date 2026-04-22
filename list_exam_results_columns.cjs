const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function listExamResultsColumns() {
  try {
    await pgClient.connect();
    const res = await pgClient.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'exam_results' AND table_schema = 'public'");
    console.log('exam_results columns:');
    for (const row of res.rows) {
      console.log(row.column_name);
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pgClient.end();
  }
}

listExamResultsColumns();
