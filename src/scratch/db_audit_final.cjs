const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function audit() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const r = await client.query("SELECT count(*) FROM grading_systems WHERE school_id = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5'");
    console.log('COUNT FOR f01e2ad5:', r.rows[0].count);
    
    const r2 = await client.query("SELECT * FROM grading_systems LIMIT 5");
    console.log('ANY DATA IN TABLE?', r2.rows.length > 0);
    if (r2.rows.length > 0) {
      console.log('Sample Row School ID:', r2.rows[0].school_id);
    }
  } finally {
    await client.end();
  }
}

audit();
