const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function audit() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const sid = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
    const r = await client.query("SELECT * FROM terms WHERE year = 2026 AND school_id = $1", [sid]);
    console.log('TERMS 2026:', r.rows);
  } finally {
    await client.end();
  }
}

audit();
