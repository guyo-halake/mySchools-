
const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function checkFunction() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    const res = await client.query("SELECT pg_get_functiondef(p.oid) FROM pg_proc p WHERE p.proname = 'current_user_school_id'");
    console.log(res.rows[0]?.pg_get_functiondef);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkFunction();
