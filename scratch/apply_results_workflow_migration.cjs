const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260410_results_workflow.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sql);
    console.log('Results workflow migration applied.');
  } catch (error) {
    console.error('Failed to apply results workflow migration:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();
