
const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function checkPolicies() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    const res = await client.query("SELECT * FROM pg_policies WHERE tablename = 'events'");
    console.log(JSON.stringify(res.rows, null, 2));

    const rlsStatus = await client.query("SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'events'");
    console.log('RLS Status:', JSON.stringify(rlsStatus.rows, null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkPolicies();
