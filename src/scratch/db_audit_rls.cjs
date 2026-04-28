const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function audit() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const r = await client.query("SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'grading_systems'");
    console.log('RLS Status:', r.rows[0]);
    const policies = await client.query("SELECT * FROM pg_policies WHERE tablename = 'grading_systems'");
    console.log('POLICIES:', policies.rows);
  } finally {
    await client.end();
  }
}

audit();
