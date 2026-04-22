const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function audit() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const res = await client.query("SELECT email, school_id FROM profiles WHERE email IN ('principal.rachi@giakanja.co.ke', 'razakwako45@gmail.com')");
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

audit();
