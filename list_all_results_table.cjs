const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function listAllResultsTable() {
  try {
    await pgClient.connect();
    const res = await pgClient.query('SELECT * FROM results');
    if (res.rows.length === 0) {
      console.log('No records in results table.');
      return;
    }
    for (const row of res.rows) {
      console.log(row);
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pgClient.end();
  }
}

listAllResultsTable();
