const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function audit() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const r = await client.query("SELECT school_id, full_name, role FROM profiles WHERE email = 'razakwako45@gmail.com'");
    console.log('User Profile:', r.rows[0]);
  } finally {
    await client.end();
  }
}

audit();
