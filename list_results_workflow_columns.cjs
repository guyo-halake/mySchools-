const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function listResultsWorkflowColumns() {
  try {
    await pgClient.connect();
    const res = await pgClient.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'results_workflow' AND table_schema = 'public'");
    console.log('results_workflow columns:');
    for (const row of res.rows) {
      console.log(row.column_name);
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pgClient.end();
  }
}

listResultsWorkflowColumns();
