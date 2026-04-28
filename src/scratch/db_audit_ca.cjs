const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function audit() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const r = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'classroom_attendance'");
    console.log('COLUMNS FOR classroom_attendance:', r.rows);
    
    const r2 = await client.query("SELECT * FROM classroom_attendance LIMIT 1");
    console.log('SAMPLE ROW:', r2.rows[0]);
  } finally {
    await client.end();
  }
}

audit();
